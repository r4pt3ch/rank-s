import Service from "../../utils/models/Service";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");
  const method = event.method;

  if (method === "PUT") {
    const body = await readBody(event);
    const patch: Record<string, any> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.price !== undefined) patch.price = Number(body.price);
    if (body.category !== undefined) patch.category = body.category;
    if (body.active !== undefined) patch.active = Boolean(body.active);
    const service = await Service.findByIdAndUpdate(id, patch, { new: true });
    if (!service) throw createError({ statusCode: 404, statusMessage: "Service not found." });
    await logAudit(user, `Updated service: "${service.name}"`);
    return { id: String(service._id), ...service.toObject() };
  }

  if (method === "DELETE") {
    const service = await Service.findByIdAndDelete(id);
    if (!service) throw createError({ statusCode: 404, statusMessage: "Service not found." });
    await logAudit(user, `Deleted service: "${service.name}"`);
    return { ok: true, id };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
