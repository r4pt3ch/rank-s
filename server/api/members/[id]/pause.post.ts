import Member from "../../../utils/models/Member";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!body.reason?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "A reason is required to pause a subscription." });
  }

  const member = await Member.findById(id);
  if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });
  if (member.membershipPaused) throw createError({ statusCode: 400, statusMessage: "Subscription is already paused." });
  if (!member.membershipDuration) throw createError({ statusCode: 400, statusMessage: "This member has no active subscription to pause." });

  member.membershipPaused = true;
  member.membershipPausedAt = new Date();
  member.membershipPauseReason = body.reason.trim();
  member.membershipResumedAt = null;
  await member.save();

  await logAudit(user, `Paused subscription for "${member.name}" — reason: ${body.reason.trim()}`);

  return {
    id: String(member._id),
    membershipPaused: true,
    membershipPausedAt: member.membershipPausedAt,
    membershipPauseReason: member.membershipPauseReason,
  };
});
