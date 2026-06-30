import Member from "../../../utils/models/Member";
import Receipt from "../../../utils/models/Receipt";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { computeExpiry, getMembershipPlan, logAudit } from "../../../utils/helpers";
import { DURATIONS } from "../../../utils/models/MembershipPlan";

const DURATION_LABEL: Record<string, string> = {
  monthly: "Monthly",
  sixmonth: "6 months",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

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

  // Record the sale of this membership plan, unless explicitly told not to (e.g. correcting a typo, not a real purchase).
  let saleRecorded = false;
  let saleAmount = 0;
  if (body.recordSale !== false) {
    const plan = await getMembershipPlan(category, body.duration);
    if (plan && plan.price > 0) {
      await Receipt.create({
        name: member.name,
        items: [{ name: `Membership plan - ${category} (${DURATION_LABEL[body.duration] || body.duration})`, price: plan.price, qty: 1 }],
        total: plan.price,
        issuedBy: user.id,
        kind: "membership",
      });
      saleRecorded = true;
      saleAmount = plan.price;
    }
  }

  await logAudit(
    user,
    `Set membership for "${member.name}" to ${category} / ${body.duration}${saleRecorded ? ` - recorded sale of ₱${saleAmount}` : ""}`
  );

  return {
    id: String(member._id),
    membershipCategory: member.membershipCategory,
    membershipDuration: member.membershipDuration,
    membershipStart: member.membershipStart,
    membershipExpiry: member.membershipExpiry,
    saleRecorded,
    saleAmount,
  };
});
