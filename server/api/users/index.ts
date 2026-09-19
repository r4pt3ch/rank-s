import bcrypt from "bcryptjs";
import User from "../../utils/models/User";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { logAudit } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin"]);
    const users = await User.find().sort({ createdAt: 1 }).lean();
    return users.map((u) => ({ id: String(u._id), username: u.username, name: u.name, email: u.email, role: u.role }));
  }

  if (method === "POST") {
    const actor = await requireRole(event, ["superadmin"]);
    const body = await readBody(event);

    if (!body.username || !body.name || !body.password) {
      throw createError({ statusCode: 400, statusMessage: "Username, name, and password are required." });
    }
    if (String(body.password).length < 6) {
      throw createError({ statusCode: 400, statusMessage: "Password must be at least 6 characters." });
    }
    const existing = await User.findOne({ username: String(body.username).toLowerCase().trim() });
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: "That username is already taken." });
    }
    const role = body.role === "superadmin" ? "superadmin" : "admin";
    const user = await User.create({
      username: String(body.username).toLowerCase().trim(),
      passwordHash: await bcrypt.hash(body.password, 10),
      name: body.name,
      email: body.email || "",
      role,
    });
    await logAudit(actor, `Created user account "${user.username}" (${role})`);
    return { id: String(user._id), username: user.username, name: user.name, email: user.email, role: user.role };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
