import CheckIn from "../utils/models/CheckIn";
import Receipt from "../utils/models/Receipt";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";
import { logAudit } from "../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin"]);

  const [checkinCount, receiptCount] = await Promise.all([
    CheckIn.countDocuments(),
    Receipt.countDocuments(),
  ]);

  await Promise.all([
    CheckIn.deleteMany({}),
    Receipt.deleteMany({}),
  ]);

  await logAudit(user, `Cleared all reports data — deleted ${checkinCount} check-ins and ${receiptCount} receipts`);

  return { ok: true, deletedCheckins: checkinCount, deletedReceipts: receiptCount };
});
