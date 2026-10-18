import Remittance from "../../../utils/models/Remittance";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";
import { formatPeso } from "../../../../utils/peso";

// Only a super admin can approve or reject a remittance void.
export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!["approve", "reject"].includes(body?.action)) {
    throw createError({ statusCode: 400, statusMessage: "Action must be 'approve' or 'reject'." });
  }

  const r = await Remittance.findById(id);
  if (!r) throw createError({ statusCode: 404, statusMessage: "Remittance not found." });
  if (r.voidStatus !== "pending") throw createError({ statusCode: 400, statusMessage: "No pending void request for this remittance." });

  r.voidReviewedBy = user.id;
  r.voidReviewedAt = new Date();

  if (body.action === "approve") {
    r.voided = true;
    r.voidStatus = "approved";
    await logAudit(user, `Approved void for sales remittance ${r.businessDate} (${formatPeso(r.totalCash)}) — removed from reports`);
  } else {
    r.voidStatus = "rejected";
    r.voidRejectionReason = body.rejectionReason?.trim() || null;
    await logAudit(user, `Rejected void request for sales remittance ${r.businessDate}${r.voidRejectionReason ? ` — ${r.voidRejectionReason}` : ""}`);
  }

  await r.save();
  return { id: String(r._id), voided: r.voided, voidStatus: r.voidStatus };
});
