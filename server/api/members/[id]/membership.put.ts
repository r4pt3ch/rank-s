import Member from "../../../utils/models/Member";
import Receipt from "../../../utils/models/Receipt";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { computeExpiry, getMembershipPlan, logAudit } from "../../../utils/helpers";
import { MEMBERSHIP_TIERS, TIER_DURATIONS, DURATION_LABELS } from "../../../utils/models/MembershipPlan";

const TIER_LABEL: Record<string, string> = {
  walkin:  "Walk-In (Rank F)",
  regular: "Regular Member (Rank E–A)",
  elite:   "Elite Member (Rank S)",
};

function dateOnly(d: Date): Date {
  // Store as start of day local time so only the date matters
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin", "user"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!MEMBERSHIP_TIERS.includes(body.tier)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid membership tier." });
  }
  const tierDurations = TIER_DURATIONS[body.tier];
  if (tierDurations.length > 0 && !tierDurations.includes(body.duration)) {
    throw createError({ statusCode: 400, statusMessage: `Duration '${body.duration}' is not valid for the ${body.tier} tier.` });
  }

  const member = await Member.findById(id);
  if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });

  const startRaw = body.start ? new Date(body.start) : new Date();
  const start = dateOnly(startRaw);
  const expiry = body.duration ? computeExpiry(start, body.duration) : null;

  member.membershipTier = body.tier;
  member.membershipCategory = body.tier;
  member.membershipStudentType = body.studentType || "non-student";
  member.membershipDuration = body.duration || null;
  member.membershipStart = start;
  member.membershipExpiry = expiry;
  // Clear any pause state when a new membership is assigned
  member.membershipPaused = false;
  member.membershipPausedAt = null;
  member.membershipPauseReason = null;
  member.membershipResumedAt = null;
  member.membershipPausedDays = 0;
  await member.save();

  let saleRecorded = false;
  let saleAmount = 0;
  if (body.recordSale !== false && body.duration) {
    const plan = await getMembershipPlan(body.tier, body.duration, body.studentType || "non-student");
    if (plan && plan.price > 0) {
      await Receipt.create({
        name: member.name,
        items: [{ name: `${TIER_LABEL[body.tier]} — ${DURATION_LABELS[body.duration] || body.duration} (${body.studentType || "non-student"})`, price: plan.price, qty: 1 }],
        total: plan.price,
        issuedBy: user.id,
        kind: "membership",
      });
      saleRecorded = true;
      saleAmount = plan.price;
    }
  }

  await logAudit(user, `Set membership for "${member.name}" to ${body.tier} / ${body.studentType || "non-student"} / ${body.duration || "—"}${saleRecorded ? ` — sale ₱${saleAmount}` : ""}`);
  return {
    id: String(member._id),
    membershipTier: member.membershipTier,
    membershipStudentType: member.membershipStudentType,
    membershipDuration: member.membershipDuration,
    membershipStart: member.membershipStart,
    membershipExpiry: member.membershipExpiry,
    saleRecorded,
    saleAmount,
  };
});
