import Expense from "../../../utils/models/Expense";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";
import { formatPeso } from "../../../../utils/peso";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin", "user"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!body?.reason?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "A reason is required to request a void." });
  }

  const x = await Expense.findById(id);
  if (!x) throw createError({ statusCode: 404, statusMessage: "Expense not found." });
  if (x.voided) throw createError({ statusCode: 400, statusMessage: "This expense has already been voided." });
  if (x.voidStatus === "pending") throw createError({ statusCode: 400, statusMessage: "A void request is already pending for this expense." });

  x.voidStatus = "pending";
  x.voidReason = body.reason.trim();
  x.voidRequestedBy = user.id;
  x.voidRequestedAt = new Date();
  x.voidRejectionReason = null;
  await x.save();

  await logAudit(user, `Requested void for expense ${formatPeso(x.amount)} — ${x.categoryLabel}: ${x.description} — reason: ${x.voidReason}`);

  return { id: String(x._id), voidStatus: "pending" };
});
