import ReceiptSettings from "../utils/models/ReceiptSettings";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";
import { logAudit } from "../utils/helpers";

const EDITABLE_FIELDS = [
  "gymName",
  "address",
  "phone",
  "footerMessage",
  "showLogo",
  "showAddress",
  "showPhone",
  "showReceiptNumber",
  "showDateTime",
  "showCashier",
  "showItemizedList",
  "showFooterMessage",
];

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin"]);
    let doc = await ReceiptSettings.findOne({ key: "default" });
    if (!doc) doc = await ReceiptSettings.create({ key: "default" });
    const obj = doc.toObject();
    delete obj._id;
    delete obj.__v;
    return obj;
  }

  if (method === "PUT") {
    const user = await requireRole(event, ["superadmin"]);
    const body = await readBody(event);
    let doc = await ReceiptSettings.findOne({ key: "default" });
    if (!doc) doc = await ReceiptSettings.create({ key: "default" });

    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) doc[field] = body[field];
    }
    await doc.save();
    await logAudit(user, "Updated printable receipt settings");
    const obj = doc.toObject();
    delete obj._id;
    delete obj.__v;
    return obj;
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
