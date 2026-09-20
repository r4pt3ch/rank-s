import bcrypt from "bcryptjs";
import User from "../../utils/models/User";
import { connectDB } from "../../utils/db";
import { requireRole, getSessionUser } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const actor = await requireRole(event, ["superadmin"]);
  const id = getRouterParam(event, "id");
  const method = event.method;

  if (method === "PUT") {
    const body = await readBody(event);
    const user = await User.findById(id);
    if (!user) throw createError({ statusCode: 404, statusMessage: "User not found." });

    const changes: string[] = [];
    if (body.name !== undefined) { user.name = body.name; changes.push("name"); }
    if (body.email !== undefined) { user.email = body.email; changes.push("email"); }
    if (body.role !== undefined && ["superadmin", "admin", "user"].includes(body.role)) { user.role = body.role; changes.push("role"); }

    if (body.newPassword) {
      if (String(body.newPassword).length < 6) {
        throw createError({ statusCode: 400, statusMessage: "Password must be at least 6 characters." });
      }
      user.passwordHash = await bcrypt.hash(body.newPassword, 10);
      changes.push("password");
    }

    await user.save();
    await logAudit(actor, `Updated user "${user.username}" — changed: ${changes.join(", ")}`);
    return { id: String(user._id), username: user.username, name: user.name, email: user.email, role: user.role };
  }

  if (method === "DELETE") {
    if (String(id) === actor.id) {
      throw createError({ statusCode: 400, statusMessage: "You cannot delete your own account." });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) throw createError({ statusCode: 404, statusMessage: "User not found." });
    await logAudit(actor, `Deleted user account "${user.username}"`);
    return { ok: true };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
