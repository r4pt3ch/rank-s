import CheckIn from "../../utils/models/CheckIn";
import { connectDB } from "../../utils/db";
import { maskName } from "../../utils/helpers";

export default defineEventHandler(async () => {
  await connectDB();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const checkins = await CheckIn.find({ createdAt: { $gte: start } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return checkins.map((c) => ({
    id: String(c._id),
    name: maskName(c.name),
    type: c.type,
    rank: c.rank,
    time: c.createdAt,
  }));
});
