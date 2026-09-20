import CheckIn from "../utils/models/CheckIn";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin", "admin", "user"]);

  const pending = await CheckIn.find({ voidStatus: "pending" })
    .populate("voidRequestedBy", "name username")
    .sort({ voidRequestedAt: -1 })
    .lean();

  return pending.map((c) => ({
    id: String(c._id),
    name: c.name,
    type: c.type,
    fee: c.fee,
    time: c.createdAt,
    voidReason: c.voidReason,
    voidRequestedAt: c.voidRequestedAt,
    voidRequestedBy: c.voidRequestedBy ? (c.voidRequestedBy as any).name : "Unknown",
    services: c.services || [],
    servicesTotal: c.servicesTotal || 0,
  }));
});
