import CheckIn from "../../../utils/models/CheckIn";
import Receipt from "../../../utils/models/Receipt";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin", "user"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const checkin = await CheckIn.findById(id);
  if (!checkin) throw createError({ statusCode: 404, statusMessage: "Check-in not found." });

  const items = (body.services || []).filter((s: any) => s.name && s.price > 0);
  if (!items.length) throw createError({ statusCode: 400, statusMessage: "At least one service is required." });

  const total = items.reduce((sum: number, s: any) => sum + Number(s.price), 0);

  checkin.services.push(...items.map((s: any) => ({ name: s.name, price: Number(s.price) })));
  checkin.servicesTotal = (checkin.servicesTotal || 0) + total;
  await checkin.save();

  // Log a receipt for the services
  const receipt = await Receipt.create({
    name: checkin.name,
    items: items.map((s: any) => ({ name: s.name, price: Number(s.price), qty: 1 })),
    total,
    issuedBy: user.id,
    kind: "pos",
  });

  await logAudit(user, `Added services to check-in for "${checkin.name}" — ₱${total}`);
  return { id: String(checkin._id), services: checkin.services, servicesTotal: checkin.servicesTotal, receiptId: String(receipt._id) };
});
