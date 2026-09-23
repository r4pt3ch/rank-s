import CheckIn from "../../../utils/models/CheckIn";
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

  const checkin = await CheckIn.findById(id);
  if (!checkin) throw createError({ statusCode: 404, statusMessage: "Check-in not found." });
  if (checkin.voidStatus !== "pending") throw createError({ statusCode: 400, statusMessage: "No pending void request for this check-in." });

  checkin.voidReviewedBy = user.id;
  checkin.voidReviewedAt = new Date();

  if (body.action === "approve") {
    checkin.voided = true;
    checkin.voidStatus = "approved";
    // Void the main visit fee receipt
    if (checkin.receipt) {
      await Receipt.findByIdAndUpdate(checkin.receipt, { voided: true });
    }
    // Void all service receipts for this client within 30 minutes of the check-in
    const windowEnd = new Date(checkin.createdAt);
    windowEnd.setMinutes(windowEnd.getMinutes() + 30);
    await Receipt.updateMany(
      {
        name: checkin.name,
        kind: "pos",
        voided: false,
        createdAt: { $gte: checkin.createdAt, $lte: windowEnd },
      },
      { voided: true }
    );
    await logAudit(user, `Approved void for check-in "${checkin.name}" — check-in fee and services removed from reports`);
  } else {
    checkin.voidStatus = "rejected";
    checkin.voidRejectionReason = body.rejectionReason?.trim() || null;
    await logAudit(user, `Rejected void request for check-in "${checkin.name}"${body.rejectionReason ? ` — ${body.rejectionReason}` : ""}`);
  }

  await checkin.save();

  return {
    id: String(checkin._id),
    voided: checkin.voided,
    voidStatus: checkin.voidStatus,
    voidRejectionReason: checkin.voidRejectionReason,
  };
});
