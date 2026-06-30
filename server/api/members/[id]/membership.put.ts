import Member from "../../../utils/models/Member";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { computeExpiry, logAudit } from "../../../utils/helpers";
import { DURATIONS } from "../../../utils/models/MembershipPlan";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const category = String(body.category || "").trim();
  if (!category) {
    throw createError({ statusCode: 400, statusMessage: "Membership category is required." });
  }
  if (!DURATIONS.includes(body.duration)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid membership duration." });
  }

  const member = await Member.findById(id);
  if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });

  const start = body.start ? new Date(body.start) : new Date();
  const expiry = computeExpiry(start, body.duration);

  member.membershipCategory = category;
  member.membershipDuration = body.duration;
  member.membershipStart = start;
  member.membershipExpiry = expiry;
  await member.save();

  await logAudit(user, `Set membership for "${member.name}" to ${category} / ${body.duration}`);
  return {
    id: String(member._id),
    membershipCategory: member.membershipCategory,
    membershipDuration: member.membershipDuration,
    membershipStart: member.membershipStart,
    membershipExpiry: member.membershipExpiry,
  };
});
