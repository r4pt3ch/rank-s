import AuditLog from "./models/AuditLog";
import Threshold, { RANKS } from "./models/Threshold";
import Settings from "./models/Settings";
import MembershipPlan from "./models/MembershipPlan";
import Member from "./models/Member";

export async function logAudit(user: { id?: string; name: string } | null, action: string) {
  await AuditLog.create({
    user: user?.id || null,
    userName: user?.name || "system",
    action,
  });
}

export async function getThresholds() {
  let doc = await Threshold.findOne({ key: "default" });
  if (!doc) {
    doc = await Threshold.create({ key: "default" });
  }
  const obj: Record<string, number> = {};
  for (const r of RANKS) obj[r] = doc.values.get(r) ?? 0;
  return obj;
}

export async function getSettings() {
  let doc = await Settings.findOne({ key: "default" });
  if (!doc) {
    doc = await Settings.create({ key: "default" });
  }
  return {
    pointsPerCheckIn: doc.pointsPerCheckIn,
    walkInFee: doc.walkInFee,
    lobbyAutoClearEnabled: doc.lobbyAutoClearEnabled,
    lobbyDisplayMinutes: doc.lobbyDisplayMinutes,
    lobbyResetAt: doc.lobbyResetAt,
  };
}

export function rankFromPoints(points: number, thresholds: Record<string, number>) {
  let current = "F";
  for (const r of RANKS) {
    if (points >= (thresholds[r] ?? 0)) current = r;
  }
  return current;
}

export function genCode(prefix: string) {
  const rand = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${rand()}${rand()}`;
}

export function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function genUniquePin() {
  // PINs are only 4 digits, so collisions are expected at scale - retry until free.
  for (let attempt = 0; attempt < 50; attempt++) {
    const pin = genPin();
    const exists = await Member.findOne({ pin }).lean();
    if (!exists) return pin;
  }
  throw createError({ statusCode: 500, statusMessage: "Could not generate a unique PIN. Try again." });
}

export function computeExpiry(start: Date, duration: string) {
  const d = new Date(start);
  if (duration === "monthly") d.setMonth(d.getMonth() + 1);
  else if (duration === "sixmonth") d.setMonth(d.getMonth() + 6);
  else if (duration === "yearly") d.setFullYear(d.getFullYear() + 1);
  else if (duration === "lifetime") return null;
  return d;
}

export function membershipStatus(member: { membershipCategory?: string | null; membershipDuration?: string | null; membershipExpiry?: Date | null }) {
  if (!member.membershipCategory || !member.membershipDuration) return "none";
  if (member.membershipDuration === "lifetime") return "active";
  if (!member.membershipExpiry) return "none";
  return new Date(member.membershipExpiry) < new Date() ? "expired" : "active";
}

export async function getMembershipPlan(category: string, duration: string) {
  return MembershipPlan.findOne({ category, duration }).lean();
}

// "Marco Dela Cruz" -> "Marco D." - used on the public lobby display so full names aren't shown.
export function maskName(fullName: string) {
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${first} ${lastInitial}.`;
}
