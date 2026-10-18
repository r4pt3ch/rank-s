import EPayment from "../../../utils/models/EPayment";
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

  const p = await EPayment.findById(id);
  if (!p) throw createError({ statusCode: 404, statusMessage: "E-payment not found." });
  if (p.voided) throw createError({ statusCode: 400, statusMessage: "This e-payment has already been voided." });
  if (p.voidStatus === "pending") throw createError({ statusCode: 400, statusMessage: "A void request is already pending for this e-payment." });

  p.voidStatus = "pending";
  p.voidReason = body.reason.trim();
  p.voidRequestedBy = user.id;
  p.voidRequestedAt = new Date();
  p.voidRejectionReason = null;
  await p.save();

  await logAudit(user, `Requested void for e-payment ${formatPeso(p.amount)} via ${p.providerLabel}${p.referenceNo ? ` (ref ${p.referenceNo})` : ""} — reason: ${p.voidReason}`);

  return { id: String(p._id), voidStatus: "pending" };
});
