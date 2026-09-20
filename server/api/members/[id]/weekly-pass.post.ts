import Member from "../../../utils/models/Member";
import Receipt from "../../../utils/models/Receipt";
import MembershipPlan from "../../../utils/models/MembershipPlan";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin", "user"]);
  const id = getRouterParam(event, "id");

  const member = await Member.findById(id);
  if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });
  if (!member.membershipTier && !member.membershipCategory) {
    throw createError({ statusCode: 400, statusMessage: "Member has no active subscription to attach a weekly pass to." });
  }

  const tier = member.membershipTier || member.membershipCategory;
  const studentType = member.membershipStudentType || "non-student";

  // Get the weekly fee from their active plan
  const plan = await MembershipPlan.findOne({ tier, studentType, duration: member.membershipDuration }).lean();
  const weeklyFee = plan?.weeklyFee || 0;

  // Set expiry to 7 days from today (end of day)
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  expiry.setHours(23, 59, 59, 999);

  member.weeklyPassExpiry = expiry;
  await member.save();

  // Record the sale if there's a fee
  if (weeklyFee > 0) {
    await Receipt.create({
      name: member.name,
      items: [{ name: `Weekly Pass — ${member.name}`, price: weeklyFee, qty: 1 }],
      total: weeklyFee,
      issuedBy: user.id,
      kind: "visit",
    });
  }

  await logAudit(user, `Issued weekly pass to "${member.name}" — expires ${expiry.toDateString()}${weeklyFee > 0 ? `, fee ₱${weeklyFee}` : " (no fee)"}`);

  return {
    id: String(member._id),
    weeklyPassExpiry: expiry,
    weeklyFee,
  };
});
