import CheckIn from "../utils/models/CheckIn";
import Receipt from "../utils/models/Receipt";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";

function getRange(period: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  const start = new Date(now);

  if (period === "custom") {
    const s = customStart ? new Date(customStart) : new Date(0);
    const e = customEnd ? new Date(customEnd) : now;
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      throw createError({ statusCode: 400, statusMessage: "Invalid custom date range." });
    }
    if (s > e) {
      throw createError({ statusCode: 400, statusMessage: "Start date must be before end date." });
    }
    return { start: s, end: e };
  }

  if (period === "alltime") {
    return { start: new Date(0), end: now };
  } else if (period === "weekly") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    // daily
    start.setHours(0, 0, 0, 0);
  }
  return { start, end: now };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin", "admin"]);

  const query = getQuery(event);
  const period = ["daily", "weekly", "monthly", "alltime", "custom"].includes(String(query.period)) ? String(query.period) : "daily";
  const { start, end } = getRange(period, query.start as string | undefined, query.end as string | undefined);

  const [checkins, receipts] = await Promise.all([
    CheckIn.find({ createdAt: { $gte: start, $lte: end } }).lean(),
    Receipt.find({ createdAt: { $gte: start, $lte: end } }).lean(),
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

  // --- Inventory sales report (POS product sales + automatic visit fees; excludes membership plan sales) ---
  const inventoryReceipts = receipts.filter((r) => r.kind !== "membership");
  const productTotals: Record<string, { qty: number; revenue: number }> = {};
  const salesByDay: Record<string, { revenue: number; transactions: number; itemsSold: number }> = {};
  let totalItemsSold = 0;
  let totalRevenue = 0;

  for (const r of inventoryReceipts) {
    totalRevenue += r.total;
    const key = dayKey(new Date(r.createdAt));
    if (!salesByDay[key]) salesByDay[key] = { revenue: 0, transactions: 0, itemsSold: 0 };
    salesByDay[key].revenue += r.total;
    salesByDay[key].transactions += 1;

    for (const item of r.items || []) {
      totalItemsSold += item.qty;
      salesByDay[key].itemsSold += item.qty;
      if (!productTotals[item.name]) productTotals[item.name] = { qty: 0, revenue: 0 };
      productTotals[item.name].qty += item.qty;
      productTotals[item.name].revenue += item.price * item.qty;
    }
  }

  const inventorySales = {
    totalTransactions: inventoryReceipts.length,
    totalItemsSold,
    totalRevenue,
    byProduct: Object.entries(productTotals)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    byDay: Object.entries(salesByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, revenue: v.revenue, transactions: v.transactions, itemsSold: v.itemsSold })),
  };

  // --- Membership plan sales report ---
  const membershipReceipts = receipts.filter((r) => r.kind === "membership");
  const planTotals: Record<string, { count: number; revenue: number }> = {};
  const membershipByDay: Record<string, { count: number; revenue: number }> = {};
  let membershipRevenue = 0;

  for (const r of membershipReceipts) {
    membershipRevenue += r.total;
    const key = dayKey(new Date(r.createdAt));
    if (!membershipByDay[key]) membershipByDay[key] = { count: 0, revenue: 0 };
    membershipByDay[key].count += 1;
    membershipByDay[key].revenue += r.total;

    for (const item of r.items || []) {
      if (!planTotals[item.name]) planTotals[item.name] = { count: 0, revenue: 0 };
      planTotals[item.name].count += item.qty;
      planTotals[item.name].revenue += item.price * item.qty;
    }
  }

  const membershipSales = {
    totalSales: membershipReceipts.length,
    totalRevenue: membershipRevenue,
    byPlan: Object.entries(planTotals)
      .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    byDay: Object.entries(membershipByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, count: v.count, revenue: v.revenue })),
  };

  return {
    period,
    range: { start, end },
    gymGoers,
    inventorySales,
    membershipSales,
  };
});
