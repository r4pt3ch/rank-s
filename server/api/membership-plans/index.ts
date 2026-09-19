import MembershipPlan, { MEMBERSHIP_TIERS, DURATIONS, TIER_DURATIONS, STUDENT_TYPES } from "../../utils/models/MembershipPlan";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin", "member"]);
    const plans = await MembershipPlan.find().sort({ tier: 1, duration: 1 }).lean();
    return plans.map((p) => ({ id: String(p._id), tier: p.tier, studentType: p.studentType, duration: p.duration, price: p.price, visitFee: p.visitFee }));
  }

  if (method === "POST") {
    const user = await requireRole(event, ["superadmin", "admin"]);
    const body = await readBody(event);
    if (!MEMBERSHIP_TIERS.includes(body.tier) || !DURATIONS.includes(body.duration)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid membership tier or duration." });
    }
    const studentType = STUDENT_TYPES.includes(body.studentType) ? body.studentType : "non-student";
    const allowed = TIER_DURATIONS[body.tier];
    if (!allowed.includes(body.duration)) {
      throw createError({ statusCode: 400, statusMessage: `Duration '${body.duration}' is not available for the ${body.tier} tier.` });
    }
    const existing = await MembershipPlan.findOne({ tier: body.tier, studentType, duration: body.duration });
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: "A plan for this tier, student type, and duration already exists." });
    }
    const plan = await MembershipPlan.create({
      tier: body.tier,
      studentType,
      duration: body.duration,
      price: Number(body.price) || 0,
      visitFee: Number(body.visitFee) || 0,
    });
    await logAudit(user, `Added membership plan: ${body.tier} / ${studentType} / ${body.duration}`);
    return { id: String(plan._id), ...plan.toObject() };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
