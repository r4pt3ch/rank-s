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
    walkInFeeStudent:    doc.walkInFeeStudent,
    walkInFeeNonStudent: doc.walkInFeeNonStudent,
    // backward-compat alias used in older code paths
    walkInFee: doc.walkInFeeNonStudent,
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
  // 6 digits supports ~900,000 unique codes - 4 digits topped out at 9,000,
  // which became a real ceiling once membership grew past that.
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function genUniquePin() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pin = genPin();
    const exists = await Member.findOne({ pin }).lean();
    if (!exists) return pin;
  }
  throw createError({ statusCode: 500, statusMessage: "Could not generate a unique PIN. Try again." });
}

export function computeExpiry(start: Date, duration: string) {
  const d = new Date(start);
  if (duration === "daily")     d.setDate(d.getDate() + 1);
  else if (duration === "monthly")   d.setMonth(d.getMonth() + 1);
  else if (duration === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (duration === "sixmonth")  d.setMonth(d.getMonth() + 6);
  else if (duration === "yearly")    d.setFullYear(d.getFullYear() + 1);
  else if (duration === "lifetime")  return null;
  return d;
}

export function membershipStatus(member: { membershipTier?: string | null; membershipCategory?: string | null; membershipDuration?: string | null; membershipExpiry?: Date | null }) {
  const tier = member.membershipTier || member.membershipCategory;
  if (!tier || !member.membershipDuration) return "none";
  if (member.membershipDuration === "lifetime") return "active";
  if (!member.membershipExpiry) return "none";
  return new Date(member.membershipExpiry) < new Date() ? "expired" : "active";
}

export async function getMembershipPlan(tier: string, duration: string, studentType?: string) {
  const query: Record<string, any> = { tier, duration };
  if (studentType) query.studentType = studentType;
  return MembershipPlan.findOne(query).lean();
}

// "Marco Dela Cruz" -> "Marco D." - used on the public lobby display so full names aren't shown.
export function maskName(fullName: string) {
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${first} ${lastInitial}.`;
}
