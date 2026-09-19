import CheckIn from "../../utils/models/CheckIn";
import { connectDB } from "../../utils/db";
import { maskName, getSettings } from "../../utils/helpers";

export default defineEventHandler(async () => {
  await connectDB();
  const settings = await getSettings();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Start from the beginning of today, but move forward if the board was manually
  // cleared, or if auto-clear is on and the rolling display window is shorter.
  let effectiveStart = todayStart;

  if (settings.lobbyResetAt && new Date(settings.lobbyResetAt) > effectiveStart) {
    effectiveStart = new Date(settings.lobbyResetAt);
  }

  if (settings.lobbyAutoClearEnabled) {
    const windowStart = new Date(Date.now() - settings.lobbyDisplayMinutes * 60 * 1000);
    if (windowStart > effectiveStart) {
      effectiveStart = windowStart;
    }
  }

  const checkins = await CheckIn.find({ createdAt: { $gte: effectiveStart } })
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
