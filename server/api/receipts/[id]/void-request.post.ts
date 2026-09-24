import Receipt from "../../../utils/models/Receipt";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!body.reason?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "A reason is required to request a void." });
  }

  const receipt = await Receipt.findById(id);
  if (!receipt) throw createError({ statusCode: 404, statusMessage: "Receipt not found." });
  if (receipt.voided) throw createError({ statusCode: 400, statusMessage: "This receipt has already been voided." });
  if (receipt.voidStatus === "pending") throw createError({ statusCode: 400, statusMessage: "A void request is already pending for this receipt." });

  receipt.voidStatus = "pending";
  receipt.voidReason = body.reason.trim();
  receipt.voidRequestedBy = user.id;
  receipt.voidRequestedAt = new Date();
  await receipt.save();

  await logAudit(user, `Requested void for receipt "${receipt.name}" (₱${receipt.total}, ${receipt.kind}) — reason: ${body.reason.trim()}`);

  return { id: String(receipt._id), voidStatus: "pending" };
});
