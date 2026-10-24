import Expense from "../../../utils/models/Expense";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";
import { formatPeso } from "../../../../utils/peso";

// Only a super admin can approve or reject an expense void.
export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!["approve", "reject"].includes(body?.action)) {
    throw createError({ statusCode: 400, statusMessage: "Action must be 'approve' or 'reject'." });
  }

  const x = await Expense.findById(id);
  if (!x) throw createError({ statusCode: 404, statusMessage: "Expense not found." });
  if (x.voidStatus !== "pending") throw createError({ statusCode: 400, statusMessage: "No pending void request for this expense." });

  x.voidReviewedBy = user.id;
  x.voidReviewedAt = new Date();
  const label = `${formatPeso(x.amount)} — ${x.categoryLabel}: ${x.description}`;

  if (body.action === "approve") {
    x.voided = true;
    x.voidStatus = "approved";
    await logAudit(user, `Approved void for expense ${label} — removed from reports`);
  } else {
    x.voidStatus = "rejected";
    x.voidRejectionReason = body.rejectionReason?.trim() || null;
    await logAudit(user, `Rejected void request for expense ${label}${x.voidRejectionReason ? ` — ${x.voidRejectionReason}` : ""}`);
  }

  await x.save();
  return { id: String(x._id), voided: x.voided, voidStatus: x.voidStatus };
});
