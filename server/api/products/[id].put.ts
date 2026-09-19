import Product from "../../utils/models/Product";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const patch: Record<string, any> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.category !== undefined) patch.category = body.category;
  if (body.stock !== undefined) patch.stock = Math.max(0, Number(body.stock));

  let product;
  if (body.stockDelta !== undefined) {
    product = await Product.findById(id);
    if (!product) throw createError({ statusCode: 404, statusMessage: "Product not found." });
    product.stock = Math.max(0, product.stock + Number(body.stockDelta));
    Object.assign(product, patch);
    await product.save();
  } else {
    product = await Product.findByIdAndUpdate(id, patch, { new: true });
    if (!product) throw createError({ statusCode: 404, statusMessage: "Product not found." });
  }

  await logAudit(user, `Updated inventory item "${product.name}"`);
  return { id: String(product._id), ...product.toObject() };
});
