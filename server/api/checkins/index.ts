import CheckIn from "../../utils/models/CheckIn";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { performCheckIn } from "../../utils/checkin";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin"]);
    const query = getQuery(event);
    const filter: Record<string, any> = {};
    if (query.today === "1") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    }
    const checkins = await CheckIn.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return checkins.map((c) => ({
      id: String(c._id),
      name: c.name,
      type: c.type,
      rank: c.rank,
      time: c.createdAt,
      fee: c.fee,
      billedAs: c.billedAs,
      expiredBilling: c.expiredBilling,
      source: c.source,
    }));
  }

  if (method === "POST") {
    const user = await requireRole(event, ["superadmin", "admin"]);
    const body = await readBody(event);
    const result = await performCheckIn({
      memberId: body.memberId,
      pin: body.pin,
      walkinName: body.name,
      issuedBy: user,
      source: "staff",
    });
    return result;
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
