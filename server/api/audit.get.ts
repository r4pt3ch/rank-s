import AuditLog from "../utils/models/AuditLog";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin"]);
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(300).lean();
  return logs.map((l) => ({ id: String(l._id), action: l.action, user: l.userName, time: l.createdAt }));
});
