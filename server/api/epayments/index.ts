import EPayment from "../../utils/models/EPayment";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";
import { getUtcOffset, gymDayKey, serializeEPayment } from "../../utils/remittance";
import { EPAY_PROVIDERS } from "../../../utils/epay";
import { formatPeso } from "../../../utils/peso";

const STAFF = ["superadmin", "admin", "user"];
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  // GET — today's electronic payments (all statuses, newest first)
  if (method === "GET") {
    await requireRole(event, STAFF);
    const utcOffset = await getUtcOffset();
    const today = gymDayKey(new Date(), utcOffset);
    const list = await EPayment.find({ businessDate: today })
      .sort({ createdAt: -1 })
      .populate("voidRequestedBy", "name")
      .populate("voidReviewedBy", "name")
      .lean();
    return { today, payments: list.map(serializeEPayment) };
  }

  // POST — log one electronic payment for today. Saved entries are final.
  if (method === "POST") {
    const user = await requireRole(event, STAFF);
    const body = await readBody(event);

    const provider = EPAY_PROVIDERS.find((p) => p.key === body?.provider);
    if (!provider) throw createError({ statusCode: 400, statusMessage: "Choose how the payment was made." });

    let providerLabel = provider.label;
    if (provider.key === "other" || provider.key === "bank") {
      const custom = clean(body?.providerName, 60);
      if (provider.key === "other" && !custom) {
        throw createError({ statusCode: 400, statusMessage: "Enter the name of the payment app or channel." });
      }
      if (custom) providerLabel = provider.key === "bank" ? `Bank transfer (${custom})` : custom;
    }

    const amount = Math.round(Number(body?.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw createError({ statusCode: 400, statusMessage: "Enter an amount greater than zero." });
    }
    if (amount > 1_000_000) {
      throw createError({ statusCode: 400, statusMessage: "That amount looks too large. Please check it." });
    }

    const referenceNo = clean(body?.referenceNo, 60);
    if (referenceNo) {
      // Same reference on the same channel = almost certainly a double entry.
      const dup = await EPayment.findOne({ provider: provider.key, referenceNo, voided: { $ne: true } }).select("_id businessDate amount").lean();
      if (dup) {
        throw createError({
          statusCode: 409,
          statusMessage: `${provider.label} reference ${referenceNo} was already logged on ${(dup as any).businessDate} (${formatPeso((dup as any).amount)}).`,
        });
      }
    }

    const utcOffset = await getUtcOffset();
    const doc = await EPayment.create({
      businessDate: gymDayKey(new Date(), utcOffset), // always today — no backdating
      provider: provider.key,
      providerLabel,
      amount,
      referenceNo,
      payerName: clean(body?.payerName, 80),
      senderAccount: clean(body?.senderAccount, 40),
      notes: clean(body?.notes, 300),
      recordedBy: user.id,
      recordedByName: user.name,
    });

    await logAudit(
      user,
      `Logged e-payment ${formatPeso(amount)} via ${providerLabel}${referenceNo ? ` (ref ${referenceNo})` : ""}${doc.payerName ? ` from ${doc.payerName}` : ""}`
    );

    return serializeEPayment(doc.toObject());
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
});
