import Receipt from "../../utils/models/Receipt";
import Product from "../../utils/models/Product";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin"]);
    const receipts = await Receipt.find().sort({ createdAt: -1 }).limit(100).populate("issuedBy", "name").lean();
    return receipts.map((r: any) => ({
      id: String(r._id),
      name: r.name,
      items: r.items,
      total: r.total,
      time: r.createdAt,
      issuedBy: r.issuedBy?.name || "system",
    }));
  }

  if (method === "POST") {
    const user = await requireRole(event, ["superadmin", "admin"]);
    const body = await readBody(event);
    if (!body.name || !Array.isArray(body.items)) {
      throw createError({ statusCode: 400, statusMessage: "Receipt name and items are required." });
    }

    const total = body.items.reduce((sum: number, i: any) => sum + i.price * i.qty, 0);

    // Deduct stock if this receipt references real product IDs (POS checkout)
    if (body.deductStock) {
      for (const item of body.items) {
        if (item.id) {
          await Product.findByIdAndUpdate(item.id, { $inc: { stock: -item.qty } });
        }
      }
    }

    const receipt = await Receipt.create({
      name: body.name,
      items: body.items.map((i: any) => ({ name: i.name, price: i.price, qty: i.qty })),
      total,
      issuedBy: user.id,
    });
    await logAudit(user, `Issued receipt to "${body.name}" totaling ₱${total.toLocaleString()}`);
    return {
      id: String(receipt._id),
      name: receipt.name,
      items: receipt.items,
      total: receipt.total,
      time: receipt.createdAt,
      issuedBy: user.name,
    };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
