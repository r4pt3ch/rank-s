import MembershipPlan from "../../utils/models/MembershipPlan";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");
  const method = event.method;

  if (method === "PUT") {
    const body = await readBody(event);
    const patch: Record<string, any> = {};
    if (body.category !== undefined) patch.category = String(body.category).trim();
    if (body.price !== undefined) patch.price = Number(body.price);
    if (body.visitFee !== undefined) patch.visitFee = Number(body.visitFee);

    if (patch.category) {
      const current = await MembershipPlan.findById(id);
      if (!current) throw createError({ statusCode: 404, statusMessage: "Membership plan not found." });
      const duplicate = await MembershipPlan.findOne({ category: patch.category, duration: current.duration, _id: { $ne: id } });
      if (duplicate) {
        throw createError({ statusCode: 409, statusMessage: "A plan with that category and duration already exists." });
      }
    }

    const plan = await MembershipPlan.findByIdAndUpdate(id, patch, { new: true });
    if (!plan) throw createError({ statusCode: 404, statusMessage: "Membership plan not found." });
    await logAudit(user, `Updated membership plan: ${plan.category} / ${plan.duration}`);
    return { id: String(plan._id), ...plan.toObject() };
  }

  if (method === "DELETE") {
    const plan = await MembershipPlan.findByIdAndDelete(id);
    if (!plan) throw createError({ statusCode: 404, statusMessage: "Membership plan not found." });
    await logAudit(user, `Deleted membership plan: ${plan.category} / ${plan.duration}`);
    return { ok: true, id };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
