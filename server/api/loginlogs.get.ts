import LoginLog from "../utils/models/LoginLog";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin"]);
  const logs = await LoginLog.find().sort({ createdAt: -1 }).limit(300).lean();
  return logs.map((l) => ({ id: String(l._id), name: l.name, username: l.username, role: l.role, time: l.createdAt }));
});
