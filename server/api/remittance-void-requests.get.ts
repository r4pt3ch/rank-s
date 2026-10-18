import Remittance from "../utils/models/Remittance";
import EPayment from "../utils/models/EPayment";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";
import { serializeRemittance, serializeEPayment } from "../utils/remittance";

// Pending void requests for cash remittances and e-payments, newest first.
export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin", "admin", "user"]);

  const [remits, epays] = await Promise.all([
    Remittance.find({ voidStatus: "pending" }).populate("voidRequestedBy", "name").lean(),
    EPayment.find({ voidStatus: "pending" }).populate("voidRequestedBy", "name").lean(),
  ]);

  return [
    ...remits.map((r) => ({ kind: "remittance", ...serializeRemittance(r) })),
    ...epays.map((p) => ({ kind: "epayment", ...serializeEPayment(p) })),
  ].sort((a, b) => new Date(b.voidRequestedAt || 0).getTime() - new Date(a.voidRequestedAt || 0).getTime());
});
