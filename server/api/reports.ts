import CheckIn from "../utils/models/CheckIn";
import Receipt from "../utils/models/Receipt";
import Settings from "../utils/models/Settings";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";
import { getTodayRange } from "../utils/helpers";

function getRange(period: string, utcOffset: number, customStart?: string, customEnd?: string) {
  const now = new Date();
  const offsetMs = utcOffset * 60 * 60 * 1000;

  function startOfDayUtc(d: Date): Date {
    const local = new Date(d.getTime() + offsetMs);
    const midnight = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
    return new Date(midnight.getTime() - offsetMs);
  }

  function endOfDayUtc(d: Date): Date {
    return new Date(startOfDayUtc(d).getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  if (period === "custom") {
    const s = customStart ? startOfDayUtc(new Date(customStart)) : new Date(0);
    const e = customEnd   ? endOfDayUtc(new Date(customEnd))     : now;
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      throw createError({ statusCode: 400, statusMessage: "Invalid custom date range." });
    }
    if (s > e) {
      throw createError({ statusCode: 400, statusMessage: "Start date must be before end date." });
    }
    return { start: s, end: e };
  }

  if (period === "alltime") return { start: new Date(0), end: now };

  const todayStart = startOfDayUtc(now);
  if (period === "daily") return { start: todayStart, end: now };

  if (period === "weekly") {
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    return { start: weekStart, end: now };
  }

  if (period === "monthly") {
    const localNow = new Date(now.getTime() + offsetMs);
    const monthStart = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 1));
    return { start: new Date(monthStart.getTime() - offsetMs), end: now };
  }

  return { start: todayStart, end: now };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin", "admin", "user"]);

  const settings = await Settings.findOne({ key: "default" }).lean();
  const utcOffset = (settings as any)?.utcOffset ?? 8;

  const query = getQuery(event);
  const period = ["daily", "weekly", "monthly", "alltime", "custom"].includes(String(query.period)) ? String(query.period) : "daily";
  const { start, end } = getRange(period, utcOffset, query.start as string | undefined, query.end as string | undefined);

  const [checkins, receipts] = await Promise.all([
    CheckIn.find({ createdAt: { $gte: start, $lte: end }, voided: { $ne: true } }).lean(),
    Receipt.find({ createdAt: { $gte: start, $lte: end }, voided: { $ne: true } }).lean(),
  ]);

  // --- Gym goers report ---
  // Same-day repeat check-ins for a member aren't billed and don't count toward attendance stats.
  const reportableCheckins = checkins.filter((c) => !c.duplicateVisit);
  const memberCheckins = reportableCheckins.filter((c) => c.type === "member");
  const walkinCheckins = reportableCheckins.filter((c) => c.type === "walkin");
  const uniqueMemberIds = new Set(memberCheckins.map((c) => String(c.member)));

  const goersByDay: Record<string, { member: number; walkin: number }> = {};
  for (const c of reportableCheckins) {
    const key = dayKey(new Date(c.createdAt));
    if (!goersByDay[key]) goersByDay[key] = { member: 0, walkin: 0 };
    goersByDay[key][c.type === "member" ? "member" : "walkin"]++;
  }

  const gymGoers = {
    totalCheckins: reportableCheckins.length,
    memberVisits: memberCheckins.length,
    walkinVisits: walkinCheckins.length,
    uniqueMembers: uniqueMemberIds.size,
    byDay: Object.entries(goersByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, member: v.member, walkin: v.walkin, total: v.member + v.walkin })),
  };

  // --- Check-in sales (visit fees charged at check-in: member visit fees + walk-in fees) ---
  const checkinReceipts = receipts.filter((r) => r.kind === "visit");
  const checkinByDay: Record<string, { revenue: number; transactions: number }> = {};
  const checkinByType: Record<string, { count: number; revenue: number }> = {};
  let checkinRevenue = 0;

  for (const r of checkinReceipts) {
    checkinRevenue += r.total;
    const key = dayKey(new Date(r.createdAt));
    if (!checkinByDay[key]) checkinByDay[key] = { revenue: 0, transactions: 0 };
    checkinByDay[key].revenue += r.total;
    checkinByDay[key].transactions += 1;
    for (const item of r.items || []) {
      if (!checkinByType[item.name]) checkinByType[item.name] = { count: 0, revenue: 0 };
      checkinByType[item.name].count += item.qty;
      checkinByType[item.name].revenue += item.price * item.qty;
    }
  }

  const checkinSales = {
    totalTransactions: checkinReceipts.length,
    totalRevenue: checkinRevenue,
    transactions: checkinReceipts
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({
        id: String(r._id),
        name: r.name,
        feeType: r.items?.[0]?.name || "Visit fee",
        amount: r.total,
        datetime: r.createdAt,
        voidStatus: (r as any).voidStatus || "none",
      })),
    byDay: Object.entries(checkinByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, revenue: v.revenue, transactions: v.transactions })),
  };

  // --- Inventory & services sales (POS products + services added during check-in) ---
  const inventoryReceipts = receipts.filter((r) => r.kind === "pos");
  let totalItemsSold = 0;
  let totalRevenue = 0;

  for (const r of inventoryReceipts) {
    totalRevenue += r.total;
    for (const item of r.items || []) totalItemsSold += item.qty;
  }

  const inventorySales = {
    totalTransactions: inventoryReceipts.length,
    totalItemsSold,
    totalRevenue,
    transactions: inventoryReceipts
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({
        id: String(r._id),
        name: r.name,
        items: r.items || [],
        total: r.total,
        datetime: r.createdAt,
        voidStatus: (r as any).voidStatus || "none",
      })),
  };

  // --- Membership plan sales report ---
  const membershipReceipts = receipts.filter((r) => r.kind === "membership");
  let membershipRevenue = 0;
  for (const r of membershipReceipts) membershipRevenue += r.total;

  const membershipSales = {
    totalSales: membershipReceipts.length,
    totalRevenue: membershipRevenue,
    transactions: membershipReceipts
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({
        id: String(r._id),
        name: r.name,
        plan: r.items?.[0]?.name || "Membership",
        amount: r.total,
        datetime: r.createdAt,
        voidStatus: (r as any).voidStatus || "none",
      })),
  };

  return {
    period,
    range: { start, end },
    gymGoers,
    checkinSales,
    inventorySales,
    membershipSales,
  };
});
