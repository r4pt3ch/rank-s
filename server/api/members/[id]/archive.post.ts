import Member from "../../../utils/models/Member";
import { connectDB } from "../../../utils/db";
import { requireRole } from "../../../utils/auth";
import { logAudit } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin"]);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const member = await Member.findById(id);
  if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });
  if (member.archived) throw createError({ statusCode: 400, statusMessage: "Member is already archived." });

  member.archived = true;
  member.archivedAt = new Date();
  member.archivedReason = body.reason?.trim() || null;
  await member.save();

  await logAudit(user, `Archived member "${member.name}"${body.reason ? ` — reason: ${body.reason.trim()}` : ""}`);

  return { id: String(member._id), archived: true };
});
