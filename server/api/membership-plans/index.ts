import MembershipPlan, { DURATIONS } from "../../utils/models/MembershipPlan";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin", "member"]);
    const plans = await MembershipPlan.find().sort({ category: 1, duration: 1 }).lean();
    return plans.map((p) => ({ id: String(p._id), category: p.category, duration: p.duration, price: p.price, visitFee: p.visitFee }));
  }

  if (method === "POST") {
    const user = await requireRole(event, ["superadmin", "admin"]);
    const body = await readBody(event);

    const category = String(body.category || "").trim();
    if (!category) {
      throw createError({ statusCode: 400, statusMessage: "Membership category is required." });
    }
    if (!DURATIONS.includes(body.duration)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid membership duration." });
    }

    const existing = await MembershipPlan.findOne({ category, duration: body.duration });
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: "A plan for this category and duration already exists. Edit it instead." });
    }

    const plan = await MembershipPlan.create({
      category,
      duration: body.duration,
      price: Number(body.price) || 0,
      visitFee: Number(body.visitFee) || 0,
    });
    await logAudit(user, `Added membership plan: ${category} / ${body.duration}`);
    return { id: String(plan._id), ...plan.toObject() };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
