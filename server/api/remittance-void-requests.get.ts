import Remittance from "../utils/models/Remittance";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";
import { serializeRemittance } from "../utils/remittance";

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin", "admin", "user"]);

  const pending = await Remittance.find({ voidStatus: "pending" })
    .populate("voidRequestedBy", "name")
    .sort({ voidRequestedAt: -1 })
    .lean();

  return pending.map(serializeRemittance);
});
