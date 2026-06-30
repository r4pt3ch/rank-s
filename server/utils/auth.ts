import jwt from "jsonwebtoken";
import type { H3Event } from "h3";
import User from "./models/User";
import Member from "./models/Member";
import { connectDB } from "./db";

const COOKIE_NAME = "ranks_session";

export function signToken(payload: { id: string; role: string }) {
  const config = useRuntimeConfig();
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "12h" });
}

export function setSessionCookie(event: H3Event, token: string) {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: "/" });
}

export async function getSessionUser(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME);
  if (!token) return null;
  const config = useRuntimeConfig();
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role: string };
    await connectDB();
    if (decoded.role === "member") {
      const member = await Member.findById(decoded.id).lean();
      if (!member) return null;
      return { id: String(member._id), username: null, name: member.name, role: "member", memberId: String(member._id) };
    }
    const user = await User.findById(decoded.id).lean();
    if (!user) return null;
    return { id: String(user._id), username: user.username, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

export async function requireUser(event: H3Event) {
  const user = await getSessionUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }
  return user;
}

export async function requireRole(event: H3Event, roles: string[]) {
  const user = await requireUser(event);
  if (!roles.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: "Not authorized for this action" });
  }
  return user;
}
