import Receipt from "../../../utils/models/Receipt";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!["approve", "reject"].includes(body.action)) {
    throw createError({ statusCode: 400, statusMessage: "Action must be 'approve' or 'reject'." });
  }

  const receipt = await Receipt.findById(id);
  if (!receipt) throw createError({ statusCode: 404, statusMessage: "Receipt not found." });
  if (receipt.voidStatus !== "pending") throw createError({ statusCode: 400, statusMessage: "No pending void request for this receipt." });

  receipt.voidReviewedBy = user.id;
  receipt.voidReviewedAt = new Date();

  if (body.action === "approve") {
    receipt.voided = true;
    receipt.voidStatus = "approved";
    await logAudit(user, `Approved void for receipt "${receipt.name}" (₱${receipt.total}, ${receipt.kind}) — removed from reports`);
  } else {
    receipt.voidStatus = "rejected";
    receipt.voidRejectionReason = body.rejectionReason?.trim() || null;
    await logAudit(user, `Rejected void request for receipt "${receipt.name}"${body.rejectionReason ? ` — ${body.rejectionReason}` : ""}`);
  }

  await receipt.save();

  return {
    id: String(receipt._id),
    voided: receipt.voided,
    voidStatus: receipt.voidStatus,
    voidRejectionReason: receipt.voidRejectionReason,
  };
});
