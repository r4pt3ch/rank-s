import Member from "../../utils/models/Member";
import { connectDB } from "../../utils/db";
import { signToken, setSessionCookie } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { pin } = await readBody(event);
  if (!pin) {
    throw createError({ statusCode: 400, statusMessage: "PIN is required." });
  }
  await connectDB();
  const member = await Member.findOne({ pin: String(pin) });
  if (!member) {
    throw createError({ statusCode: 401, statusMessage: "Incorrect PIN." });
  }
  const token = signToken({ id: String(member._id), role: "member" });
  setSessionCookie(event, token);
  return { id: String(member._id), name: member.name, role: "member" };
});
