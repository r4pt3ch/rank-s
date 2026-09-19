import bcrypt from "bcryptjs";
import User from "../../utils/models/User";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const session = await requireRole(event, ["superadmin", "admin"]);
  const method = event.method;

  if (method === "GET") {
    const user = await User.findById(session.id).lean();
    if (!user) throw createError({ statusCode: 404, statusMessage: "Account not found." });
    return { id: String(user._id), username: user.username, name: user.name, email: user.email, role: user.role };
  }

  if (method === "PUT") {
    const body = await readBody(event);
    const user = await User.findById(session.id);
    if (!user) throw createError({ statusCode: 404, statusMessage: "Account not found." });

    if (body.name !== undefined) user.name = body.name;
    if (body.email !== undefined) user.email = body.email;

    if (body.newPassword) {
      if (!body.currentPassword) {
        throw createError({ statusCode: 400, statusMessage: "Enter your current password to set a new one." });
      }
      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!valid) {
        throw createError({ statusCode: 401, statusMessage: "Current password is incorrect." });
      }
      if (String(body.newPassword).length < 6) {
        throw createError({ statusCode: 400, statusMessage: "New password must be at least 6 characters." });
      }
      user.passwordHash = await bcrypt.hash(body.newPassword, 10);
    }

    await user.save();
    await logAudit(session, `Updated own account profile${body.newPassword ? " and changed password" : ""}`);
    return { id: String(user._id), username: user.username, name: user.name, email: user.email, role: user.role };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
