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
  const user = await User.findOne({ username: String(username).toLowerCase().trim() });
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Incorrect username or password." });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: "Incorrect username or password." });
  }

  const token = signToken({ id: String(user._id), role: user.role });
  setSessionCookie(event, token);

  await LoginLog.create({
    user: user._id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  return { id: String(user._id), username: user.username, name: user.name, role: user.role };
});
