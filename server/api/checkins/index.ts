import CheckIn from "../../utils/models/CheckIn";
import Settings from "../../utils/models/Settings";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { performCheckIn } from "../../utils/checkin";
import { getTodayRange } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin", "user"]);
    const query = getQuery(event);
    const filter: Record<string, any> = {};
    if (query.today === "1") {
      const settings = await Settings.findOne({ key: "default" }).lean();
      const { start, end } = getTodayRange(settings?.utcOffset ?? 8);
      filter.createdAt = { $gte: start, $lte: end };
    }
    const checkins = await CheckIn.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("member", "membershipTier membershipCategory membershipDuration membershipStudentType")
      .lean();
    return checkins.map((c: any) => ({
      id: String(c._id),
      name: c.name,
      type: c.type,
      rank: c.rank,
      time: c.createdAt,
      fee: c.fee,
      billedAs: c.billedAs,
      expiredBilling: c.expiredBilling,
      duplicateVisit: c.duplicateVisit,
      visitType: c.visitType,
      voided: c.voided || false,
      voidStatus: c.voidStatus || "none",
      voidReason: c.voidReason || null,
      services: c.services || [],
      servicesTotal: c.servicesTotal || 0,
      source: c.source,
      membershipTier: c.member?.membershipTier || c.member?.membershipCategory || null,
      membershipDuration: c.member?.membershipDuration || null,
      membershipStudentType: c.member?.membershipStudentType || null,
    }));
  }

  if (method === "POST") {
    const user = await requireRole(event, ["superadmin", "admin", "user"]);
    const body = await readBody(event);
    const result = await performCheckIn({
      memberId: body.memberId,
      pin: body.pin,
      walkinName: body.name,
      walkinStudentType: body.studentType || "non-student",
      walkinPassType: body.passType || "daily",
      issuedBy: user,
      source: "staff",
    } as any);
    return result;
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
