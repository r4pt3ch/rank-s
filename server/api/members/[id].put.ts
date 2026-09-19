import Member from "../../utils/models/Member";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const allowed = ["firstName", "lastName", "email", "phone", "address", "dob", "points"];
  const patch: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    const current = await Member.findById(id);
    if (!current) throw createError({ statusCode: 404, statusMessage: "Member not found." });
    const firstName = patch.firstName !== undefined ? String(patch.firstName).trim() : current.firstName;
    const lastName = patch.lastName !== undefined ? String(patch.lastName).trim() : current.lastName;
    patch.firstName = firstName;
    patch.lastName = lastName;
    patch.name = `${firstName} ${lastName}`;
  }

  const member = await Member.findByIdAndUpdate(id, patch, { new: true });
  if (!member) {
    throw createError({ statusCode: 404, statusMessage: "Member not found." });
  }
  await logAudit(user, `Modified information for member "${member.name}"`);
  return { id: String(member._id), ...member.toObject() };
});
