import Remittance from "../../utils/models/Remittance";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";
import { getUtcOffset, gymDayKey, todaysRecordedSales, serializeRemittance } from "../../utils/remittance";
import { PESO_DENOMINATIONS, pesoTotal, formatPeso } from "../../../utils/peso";

const STAFF = ["superadmin", "admin", "user"];

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  // GET — today's summary plus the most recent remittances
  if (method === "GET") {
    await requireRole(event, STAFF);
    const utcOffset = await getUtcOffset();
    const today = gymDayKey(new Date(), utcOffset);

    const [sales, todayAgg, recent] = await Promise.all([
      todaysRecordedSales(utcOffset),
      Remittance.aggregate([
        { $match: { businessDate: today, voided: { $ne: true } } },
        { $group: { _id: null, total: { $sum: "$totalCash" } } },
      ]),
      Remittance.find()
        .sort({ createdAt: -1 })
        .limit(60)
        .populate("voidRequestedBy", "name")
        .populate("voidReviewedBy", "name")
        .lean(),
    ]);

    const todayRemitted = todayAgg[0]?.total || 0;

    return {
      today,
      todaySales: sales.total,
      todaySalesCount: sales.count,
      todayRemitted: Math.round(todayRemitted * 100) / 100,
      records: recent.map(serializeRemittance),
    };
  }

  // POST — save a remittance for the current business day. Saved records are final.
  if (method === "POST") {
    const user = await requireRole(event, STAFF);
    const body = await readBody(event);
    const counts = (body?.counts || {}) as Record<string, number>;

    const denominations = [];
    for (const d of PESO_DENOMINATIONS) {
      const raw = Number(counts[d.key] ?? 0);
      if (!Number.isFinite(raw) || raw < 0 || !Number.isInteger(raw)) {
        throw createError({ statusCode: 400, statusMessage: `Invalid count for ${d.label} ${d.type}.` });
      }
      if (raw > 0) denominations.push({ key: d.key, value: d.value, type: d.type, count: raw });
    }

    const totalCash = pesoTotal(counts);
    if (totalCash <= 0) {
      throw createError({ statusCode: 400, statusMessage: "Enter at least one bill or coin count." });
    }
    const billsTotal = pesoTotal(Object.fromEntries(denominations.filter((d) => d.type === "bill").map((d) => [d.key, d.count])));
    const coinsTotal = Math.round((totalCash - billsTotal) * 100) / 100;

    const utcOffset = await getUtcOffset();
    const businessDate = gymDayKey(new Date(), utcOffset); // always today — staff can't backdate

    const doc = await Remittance.create({
      businessDate,
      denominations,
      totalCash,
      billsTotal,
      coinsTotal,
      remarks: String(body?.remarks || "").trim().slice(0, 500),
      submittedBy: user.id,
      submittedByName: user.name,
    });

    await logAudit(user, `Saved sales remittance for ${businessDate} — ${formatPeso(totalCash)} cash on hand`);

    return serializeRemittance(doc.toObject());
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
});
