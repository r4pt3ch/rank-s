import CheckIn from "../../../utils/models/CheckIn";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin", "user"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!body.reason?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "A reason is required to request a void." });
  }

  const checkin = await CheckIn.findById(id);
  if (!checkin) throw createError({ statusCode: 404, statusMessage: "Check-in not found." });
  if (checkin.voided) throw createError({ statusCode: 400, statusMessage: "This check-in has already been voided." });
  if (checkin.voidStatus === "pending") throw createError({ statusCode: 400, statusMessage: "A void request is already pending for this check-in." });

  checkin.voidStatus = "pending";
  checkin.voidReason = body.reason.trim();
  checkin.voidRequestedBy = user.id;
  checkin.voidRequestedAt = new Date();
  await checkin.save();

  await logAudit(user, `Requested void for check-in "${checkin.name}" — reason: ${body.reason.trim()}`);

  return { id: String(checkin._id), voidStatus: "pending" };
});
