import CheckIn from "../utils/models/CheckIn";
import Receipt from "../utils/models/Receipt";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";

function getRange(period: string) {
  const now = new Date();
  const start = new Date(now);

  if (period === "weekly") {
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
  const period = ["daily", "weekly", "monthly"].includes(String(query.period)) ? String(query.period) : "daily";
  const { start, end } = getRange(period);

  const [checkins, receipts] = await Promise.all([
    CheckIn.find({ createdAt: { $gte: start, $lte: end } }).lean(),
    Receipt.find({ createdAt: { $gte: start, $lte: end } }).lean(),
  ]);

  // --- Gym goers report ---
  const memberCheckins = checkins.filter((c) => c.type === "member");
  const walkinCheckins = checkins.filter((c) => c.type === "walkin");
  const uniqueMemberIds = new Set(memberCheckins.map((c) => String(c.member)));

  const goersByDay: Record<string, { member: number; walkin: number }> = {};
  for (const c of checkins) {
    const key = dayKey(new Date(c.createdAt));
    if (!goersByDay[key]) goersByDay[key] = { member: 0, walkin: 0 };
    goersByDay[key][c.type === "member" ? "member" : "walkin"]++;
  }

  const gymGoers = {
    totalCheckins: checkins.length,
    memberVisits: memberCheckins.length,
    walkinVisits: walkinCheckins.length,
    uniqueMembers: uniqueMemberIds.size,
    byDay: Object.entries(goersByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, member: v.member, walkin: v.walkin, total: v.member + v.walkin })),
  };

  // --- Inventory sales report ---
  const productTotals: Record<string, { qty: number; revenue: number }> = {};
  const salesByDay: Record<string, { revenue: number; transactions: number; itemsSold: number }> = {};
  let totalItemsSold = 0;
  let totalRevenue = 0;

  for (const r of receipts) {
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
    totalTransactions: receipts.length,
    totalItemsSold,
    totalRevenue,
    byProduct: Object.entries(productTotals)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    byDay: Object.entries(salesByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, revenue: v.revenue, transactions: v.transactions, itemsSold: v.itemsSold })),
  };

  return {
    period,
    range: { start, end },
    gymGoers,
    inventorySales,
  };
});
