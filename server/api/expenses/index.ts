import Expense from "../../utils/models/Expense";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";
import { getUtcOffset, gymDayKey, serializeExpense } from "../../utils/remittance";
import { EXPENSE_CATEGORIES } from "../../../utils/expense";
import { formatPeso } from "../../../utils/peso";

const STAFF = ["superadmin", "admin", "user"];
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  // GET — today's expenses (all statuses, newest first)
  if (method === "GET") {
    await requireRole(event, STAFF);
    const utcOffset = await getUtcOffset();
    const today = gymDayKey(new Date(), utcOffset);
    const list = await Expense.find({ businessDate: today })
      .sort({ createdAt: -1 })
      .populate("voidRequestedBy", "name")
      .populate("voidReviewedBy", "name")
      .lean();
    return { today, expenses: list.map(serializeExpense) };
  }

  // POST — log one expense for today. Saved entries are final.
  if (method === "POST") {
    const user = await requireRole(event, STAFF);
    const body = await readBody(event);

    const category = EXPENSE_CATEGORIES.find((c) => c.key === body?.category);
    if (!category) throw createError({ statusCode: 400, statusMessage: "Choose what the expense was for." });

    const amount = Math.round(Number(body?.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw createError({ statusCode: 400, statusMessage: "Enter an amount greater than zero." });
    }
    if (amount > 1_000_000) {
      throw createError({ statusCode: 400, statusMessage: "That amount looks too large. Please check it." });
    }

    const description = clean(body?.description, 200);
    if (!description) {
      throw createError({ statusCode: 400, statusMessage: "Describe what the money was spent on." });
    }

    const paidFrom = body?.paidFrom === "other" ? "other" : "cash";

    const utcOffset = await getUtcOffset();
    const doc = await Expense.create({
      businessDate: gymDayKey(new Date(), utcOffset), // always today — no backdating
      category: category.key,
      categoryLabel: category.label,
      amount,
      description,
      paidTo: clean(body?.paidTo, 80),
      receiptNo: clean(body?.receiptNo, 60),
      paidFrom,
      recordedBy: user.id,
      recordedByName: user.name,
    });

    await logAudit(
      user,
      `Logged expense ${formatPeso(amount)} — ${category.label}: ${description}${doc.paidTo ? ` (paid to ${doc.paidTo})` : ""}${paidFrom === "cash" ? " · from cash on hand" : " · not from drawer"}`
    );

    return serializeExpense(doc.toObject());
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed." });
});
