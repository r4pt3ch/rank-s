import Member from "../utils/models/Member";
import Receipt from "../utils/models/Receipt";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function durationApproxDays(itemName: string): number {
  const n = itemName.toLowerCase();
  if (n.includes("annual"))   return 366;
  if (n.includes("6 month"))  return 185;
  if (n.includes("3 month") || n.includes("quarterly")) return 95;
  return 35; // monthly default
}

function computeStreak(receipts: Array<{ date: Date; itemName: string }>) {
  if (!receipts.length) return { longestStreak: 0, currentStreak: 0, totalPurchases: 0 };

  // Sort ascending by date
  const sorted = [...receipts].sort((a, b) => a.date.getTime() - b.date.getTime());

  let longestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap = daysBetween(prev.date, curr.date);
    const allowance = durationApproxDays(prev.itemName) + 30; // grace period

    if (gap <= allowance) {
      currentRun++;
      longestStreak = Math.max(longestStreak, currentRun);
    } else {
      currentRun = 1;
    }
  }

  // Current streak: how many consecutive purchases ending at the most recent one still look active
  const now = new Date();
  let currentStreak = 1;
  for (let i = sorted.length - 1; i >= 1; i--) {
    const curr = sorted[i];
    const prev = sorted[i - 1];
    const gap = daysBetween(prev.date, curr.date);
    const allowance = durationApproxDays(prev.itemName) + 30;
    if (gap <= allowance) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Check if the last subscription is still active
  const lastReceipt = sorted[sorted.length - 1];
  const daysSinceLast = daysBetween(lastReceipt.date, now);
  const lastAllowance = durationApproxDays(lastReceipt.itemName) + 30;
  if (daysSinceLast > lastAllowance) {
    currentStreak = 0; // lapsed
  }

  return { longestStreak, currentStreak, totalPurchases: sorted.length };
}

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin", "admin", "user"]);

  const query = getQuery(event);
  const filter: Record<string, any> = {};

  if (query.year) {
    const y = Number(query.year);
    filter.joinDate = {
      $gte: new Date(`${y}-01-01`),
      $lte: new Date(`${y}-12-31T23:59:59`),
    };
  }
  if (query.month && query.year) {
    const y = Number(query.year);
    const m = Number(query.month);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    filter.joinDate = { $gte: start, $lte: end };
  }

  const members = await Member.find(filter).sort({ joinDate: -1 }).lean();

  // Fetch all membership receipts once and group by member name
  const allReceipts = await Receipt.find({ kind: "membership", voided: { $ne: true } }).lean();
  const receiptsByName: Record<string, Array<{ date: Date; itemName: string; amount: number }>> = {};
  for (const r of allReceipts) {
    if (!receiptsByName[r.name]) receiptsByName[r.name] = [];
    receiptsByName[r.name].push({
      date: new Date(r.createdAt),
      itemName: r.items?.[0]?.name || "",
      amount: r.total,
    });
  }

  const now = new Date();

  const analytics = members.map((m) => {
    const joinDate = m.joinDate ? new Date(m.joinDate) : new Date(m.createdAt);
    const daysRegistered = daysBetween(joinDate, now);
    const receipts = receiptsByName[m.name] || [];
    const { longestStreak, currentStreak, totalPurchases } = computeStreak(receipts);
    const totalSpent = receipts.reduce((s, r) => s + r.amount, 0);

    return {
      id: String(m._id),
      name: m.name,
      rank: null, // computed client-side from points
      points: m.points,
      joinDate: joinDate.toISOString().slice(0, 10),
      daysRegistered,
      membershipStatus: m.membershipPaused ? "paused" : (!m.membershipDuration ? "none" : (m.membershipExpiry && new Date(m.membershipExpiry) < now ? "expired" : "active")),
      currentTier: m.membershipTier || m.membershipCategory || null,
      currentDuration: m.membershipDuration || null,
      currentStudentType: m.membershipStudentType || null,
      totalPurchases,
      longestStreak,  // longest consecutive renewal streak
      currentStreak,  // current active streak (0 if lapsed)
      totalSpent,
      purchases: receipts
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((r) => ({ date: r.date.toISOString().slice(0, 10), plan: r.itemName, amount: r.amount })),
    };
  });

  return { total: analytics.length, members: analytics };
});
