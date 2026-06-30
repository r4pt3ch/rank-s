import Product from "../../utils/models/Product";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin"]);
    const products = await Product.find().sort({ name: 1 }).lean();
    return products.map((p) => ({ id: String(p._id), ...p }));
  }

  if (method === "POST") {
    const user = await requireRole(event, ["superadmin", "admin"]);
    const body = await readBody(event);
    if (!body.name || body.price === undefined) {
      throw createError({ statusCode: 400, statusMessage: "Product name and price are required." });
    }
    const product = await Product.create({
      name: body.name,
      price: Number(body.price),
      stock: Number(body.stock) || 0,
      category: body.category || "General",
    });
    await logAudit(user, `Added inventory item "${product.name}"`);
    return { id: String(product._id), ...product.toObject() };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
