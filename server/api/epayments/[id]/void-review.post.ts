import EPayment from "../../../utils/models/EPayment";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";
import { formatPeso } from "../../../../utils/peso";

// Only a super admin can approve or reject an e-payment void.
export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!["approve", "reject"].includes(body?.action)) {
    throw createError({ statusCode: 400, statusMessage: "Action must be 'approve' or 'reject'." });
  }

  const p = await EPayment.findById(id);
  if (!p) throw createError({ statusCode: 404, statusMessage: "E-payment not found." });
  if (p.voidStatus !== "pending") throw createError({ statusCode: 400, statusMessage: "No pending void request for this e-payment." });

  p.voidReviewedBy = user.id;
  p.voidReviewedAt = new Date();
  const label = `${formatPeso(p.amount)} via ${p.providerLabel}${p.referenceNo ? ` (ref ${p.referenceNo})` : ""}`;

  if (body.action === "approve") {
    p.voided = true;
    p.voidStatus = "approved";
    await logAudit(user, `Approved void for e-payment ${label} — removed from reports`);
  } else {
    p.voidStatus = "rejected";
    p.voidRejectionReason = body.rejectionReason?.trim() || null;
    await logAudit(user, `Rejected void request for e-payment ${label}${p.voidRejectionReason ? ` — ${p.voidRejectionReason}` : ""}`);
  }

  await p.save();
  return { id: String(p._id), voided: p.voided, voidStatus: p.voidStatus };
});
