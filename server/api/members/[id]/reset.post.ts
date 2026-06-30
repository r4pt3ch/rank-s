import Member from "../../../utils/models/Member";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { genCode, genUniquePin, logAudit } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");

  const pin = await genUniquePin();
  const member = await Member.findByIdAndUpdate(
    id,
    { qr: genCode("QR"), barcode: genCode("BC"), pin },
    { new: true }
  );
  if (!member) {
    throw createError({ statusCode: 404, statusMessage: "Member not found." });
  }
  await logAudit(user, `Reset QR/Barcode/PIN credentials for member "${member.name}"`);
  return { id: String(member._id), ...member.toObject() };
});
