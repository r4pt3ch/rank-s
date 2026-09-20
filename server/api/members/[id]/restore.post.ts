import Member from "../../../utils/models/Member";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin"]);
  const id = getRouterParam(event, "id");

  const member = await Member.findById(id);
  if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });
  if (!member.archived) throw createError({ statusCode: 400, statusMessage: "Member is not archived." });

  member.archived = false;
  member.archivedAt = null;
  member.archivedReason = null;
  await member.save();

  await logAudit(user, `Restored archived member "${member.name}" to active`);

  return { id: String(member._id), archived: false };
});
