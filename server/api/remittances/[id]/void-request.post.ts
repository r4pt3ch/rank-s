import Remittance from "../../../utils/models/Remittance";
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

  const r = await Remittance.findById(id);
  if (!r) throw createError({ statusCode: 404, statusMessage: "Remittance not found." });
  if (r.voided) throw createError({ statusCode: 400, statusMessage: "This remittance has already been voided." });
  if (r.voidStatus === "pending") throw createError({ statusCode: 400, statusMessage: "A void request is already pending for this remittance." });

  r.voidStatus = "pending";
  r.voidReason = body.reason.trim();
  r.voidRequestedBy = user.id;
  r.voidRequestedAt = new Date();
  r.voidRejectionReason = null;
  await r.save();

  await logAudit(user, `Requested void for sales remittance ${r.businessDate} (${formatPeso(r.totalCash)}) — reason: ${r.voidReason}`);

  return { id: String(r._id), voidStatus: "pending" };
});
