import Member from "../../../utils/models/Member";
import Receipt from "../../../utils/models/Receipt";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { computeExpiry, getMembershipPlan, logAudit } from "../../../utils/helpers";
import { MEMBERSHIP_TIERS, DURATIONS, TIER_DURATIONS, DURATION_LABELS } from "../../../utils/models/MembershipPlan";

const TIER_LABEL: Record<string, string> = {
  walkin:  "Walk-In (Rank F)",
  regular: "Regular Member (Rank E–A)",
  elite:   "Elite Member (Rank S)",
};

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!MEMBERSHIP_TIERS.includes(body.tier)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid membership tier." });
  }
  const tierDurations = TIER_DURATIONS[body.tier];
  if (tierDurations.length > 0 && !tierDurations.includes(body.duration)) {
    throw createError({ statusCode: 400, statusMessage: `Duration '${body.duration}' is not valid for this tier.` });
  }

  const member = await Member.findById(id);
  if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });

  const start = body.start ? new Date(body.start) : new Date();
  const expiry = body.duration ? computeExpiry(start, body.duration) : null;

  member.membershipTier = body.tier;
  member.membershipCategory = body.tier;
  member.membershipStudentType = body.studentType || "non-student";
  member.membershipDuration = body.duration || null;
  member.membershipStart = start;
  member.membershipExpiry = expiry;
  await member.save();

  let saleRecorded = false;
  let saleAmount = 0;
  if (body.recordSale !== false && body.duration) {
    const plan = await getMembershipPlan(body.tier, body.duration, body.studentType || "non-student");
    if (plan && plan.price > 0) {
      await Receipt.create({
        name: member.name,
        items: [{ name: `${TIER_LABEL[body.tier]} — ${DURATION_LABELS[body.duration] || body.duration}`, price: plan.price, qty: 1 }],
        total: plan.price,
        issuedBy: user.id,
        kind: "membership",
      });
      saleRecorded = true;
      saleAmount = plan.price;
    }
  }

  await logAudit(user, `Set membership for "${member.name}" to ${body.tier} / ${body.duration || "—"}${saleRecorded ? ` — recorded sale ₱${saleAmount}` : ""}`);
  return {
    id: String(member._id),
    membershipTier: member.membershipTier,
    membershipDuration: member.membershipDuration,
    membershipStart: member.membershipStart,
    membershipExpiry: member.membershipExpiry,
    saleRecorded,
    saleAmount,
  };
});
