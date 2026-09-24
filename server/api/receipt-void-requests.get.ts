import Receipt from "../utils/models/Receipt";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin", "admin"]);

  const pending = await Receipt.find({ voidStatus: "pending" })
    .populate("voidRequestedBy", "name username")
    .sort({ voidRequestedAt: -1 })
    .lean();

  return pending.map((r) => ({
    id: String(r._id),
    name: r.name,
    kind: r.kind,
    total: r.total,
    items: r.items,
    time: r.createdAt,
    voidReason: r.voidReason,
    voidRequestedAt: r.voidRequestedAt,
    voidRequestedBy: r.voidRequestedBy ? (r.voidRequestedBy as any).name : "Unknown",
  }));
});
