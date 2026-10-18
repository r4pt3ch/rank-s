import bcrypt from "bcryptjs";
import User from "../../utils/models/User";
import LoginLog from "../../utils/models/LoginLog";
import { connectDB } from "../../utils/db";
import { signToken, setSessionCookie } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event);
  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: "Username and password are required." });
  }
  await connectDB();
  const user = await User.findOne({ username: String(username).toLowerCase().trim() })
    .select("_id username name role passwordHash")
    .lean();
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Incorrect username or password." });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: "Incorrect username or password." });
  }

  const token = signToken({ id: String(user._id), role: user.role });
  setSessionCookie(event, token);

  // Record the login without making the user wait for the write.
  LoginLog.create({
    user: user._id,
    username: user.username,
    name: user.name,
    role: user.role,
  }).catch((err) => console.error("[login] failed to write login log:", err?.message));

  return { id: String(user._id), username: user.username, name: user.name, role: user.role };
});
