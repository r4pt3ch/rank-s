import Service from "../../utils/models/Service";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin"]);
    const services = await Service.find().sort({ category: 1, name: 1 }).lean();
    return services.map((s) => ({ id: String(s._id), name: s.name, price: s.price, category: s.category, active: s.active }));
  }

  if (method === "POST") {
    const user = await requireRole(event, ["superadmin", "admin"]);
    const body = await readBody(event);
    if (!body.name) throw createError({ statusCode: 400, statusMessage: "Service name is required." });
    const service = await Service.create({
      name: body.name,
      price: Number(body.price) || 0,
      category: body.category || "General",
      active: true,
    });
    await logAudit(user, `Added service: "${service.name}" at ₱${service.price}`);
    return { id: String(service._id), ...service.toObject() };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
