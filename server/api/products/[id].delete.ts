import Product from "../../utils/models/Product";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");

  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: "Product not found." });
  }
  await logAudit(user, `Deleted inventory item "${product.name}"`);
  return { ok: true, id };
});
