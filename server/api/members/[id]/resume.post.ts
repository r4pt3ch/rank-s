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
    throw createError({ statusCode: 400, statusMessage: "A reason is required to resume a subscription." });
  }

  const member = await Member.findById(id);
  if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });
  if (!member.membershipPaused) throw createError({ statusCode: 400, statusMessage: "Subscription is not currently paused." });

  // Calculate how many days it was paused and extend the expiry by that amount
  const pausedAt = member.membershipPausedAt ? new Date(member.membershipPausedAt) : new Date();
  const now = new Date();
  const pausedMs = now.getTime() - pausedAt.getTime();
  const pausedDays = Math.ceil(pausedMs / (1000 * 60 * 60 * 24));

  if (member.membershipExpiry) {
    const newExpiry = new Date(member.membershipExpiry);
    newExpiry.setDate(newExpiry.getDate() + pausedDays);
    newExpiry.setHours(23, 59, 59, 999);
    member.membershipExpiry = newExpiry;
  }

  member.membershipPaused = false;
  member.membershipResumedAt = now;
  member.membershipPausedDays = (member.membershipPausedDays || 0) + pausedDays;

  await member.save();

  await logAudit(user, `Resumed subscription for "${member.name}" (was paused ${pausedDays} day${pausedDays === 1 ? "" : "s"}, expiry extended to ${member.membershipExpiry?.toDateString()}) — reason: ${body.reason.trim()}`);

  return {
    id: String(member._id),
    membershipPaused: false,
    membershipExpiry: member.membershipExpiry,
    membershipResumedAt: member.membershipResumedAt,
    pausedDays,
  };
});
