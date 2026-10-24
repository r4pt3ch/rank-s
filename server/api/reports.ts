import CheckIn from "../utils/models/CheckIn";
import Receipt from "../utils/models/Receipt";
import Settings from "../utils/models/Settings";
import Remittance from "../utils/models/Remittance";
import EPayment from "../utils/models/EPayment";
import Expense from "../utils/models/Expense";
import { EPAY_PROVIDERS } from "../../utils/epay";
import { EXPENSE_CATEGORIES, cashBalance } from "../../utils/expense";
import { PESO_DENOMINATIONS } from "../../utils/peso";
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

function dayKey(date: Date, utcOffset: number): string {
  const local = new Date(date.getTime() + utcOffset * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin", "admin", "user"]);

  const settings = await Settings.findOne({ key: "default" }).lean();
  const utcOffset = (settings as any)?.utcOffset ?? 8;

  const query = getQuery(event);
  const period = ["daily", "weekly", "monthly", "alltime", "custom"].includes(String(query.period)) ? String(query.period) : "daily";
  const { start, end } = getRange(period, utcOffset, query.start as string | undefined, query.end as string | undefined);

  // Remittances are keyed by gym-local business date (YYYY-MM-DD), so compare as strings.
  const startDay = dayKey(start, utcOffset);
  const endDay = dayKey(end, utcOffset);

  const [checkins, receipts, voidedCheckins, voidedReceipts, remittances, epayments, expenseDocs] = await Promise.all([
    CheckIn.find({ createdAt: { $gte: start, $lte: end }, voided: { $ne: true } }).lean(),
    Receipt.find({ createdAt: { $gte: start, $lte: end }, voided: { $ne: true } }).lean(),
    CheckIn.find({ createdAt: { $gte: start, $lte: end }, voided: true }).lean(),
    Receipt.find({ createdAt: { $gte: start, $lte: end }, voided: true }).lean(),
    Remittance.find({ businessDate: { $gte: startDay, $lte: endDay } })
      .populate("voidRequestedBy", "name")
      .populate("voidReviewedBy", "name")
      .sort({ createdAt: -1 })
      .lean(),
    EPayment.find({ businessDate: { $gte: startDay, $lte: endDay } })
      .populate("voidRequestedBy", "name")
      .populate("voidReviewedBy", "name")
      .sort({ createdAt: -1 })
      .lean(),
    Expense.find({ businessDate: { $gte: startDay, $lte: endDay } })
      .populate("voidRequestedBy", "name")
      .populate("voidReviewedBy", "name")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  // --- Gym goers report ---
  // Same-day repeat check-ins for a member aren't billed and don't count toward attendance stats.
  const reportableCheckins = checkins.filter((c) => !c.duplicateVisit);
  const memberCheckins = reportableCheckins.filter((c) => c.type === "member");
  const walkinCheckins = reportableCheckins.filter((c) => c.type === "walkin");
  const uniqueMemberIds = new Set(memberCheckins.map((c) => String(c.member)));

  const goersByDay: Record<string, { member: number; walkin: number }> = {};
  for (const c of reportableCheckins) {
    const key = dayKey(new Date(c.createdAt), utcOffset);
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
    const key = dayKey(new Date(r.createdAt), utcOffset);
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

  // --- Check-in list (individual entries, sorted newest first) ---
  const checkinList = checkins
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((c) => ({
      id: String(c._id),
      name: c.name,
      type: c.type,
      rank: c.rank,
      tier: (c as any).billedAs === "walkin" ? "walkin" : ((c as any).membershipTier || null),
      fee: c.fee || 0,
      servicesTotal: (c as any).servicesTotal || 0,
      duplicateVisit: c.duplicateVisit || false,
      expiredBilling: (c as any).expiredBilling || false,
      voided: c.voided || false,
      datetime: c.createdAt,
    }));

  // --- Voided records ---
  const voidedTotal = voidedReceipts.reduce((s, r) => s + r.total, 0);
  const voided = {
    totalVoidedCheckins: voidedCheckins.length,
    totalVoidedReceipts: voidedReceipts.length,
    totalVoidedAmount: voidedTotal,
    checkins: voidedCheckins
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((c) => ({
        id: String(c._id),
        name: c.name,
        type: c.type,
        fee: c.fee || 0,
        datetime: c.createdAt,
        voidReason: (c as any).voidReason || null,
        voidReviewedAt: (c as any).voidReviewedAt || null,
      })),
    receipts: voidedReceipts
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({
        id: String(r._id),
        name: r.name,
        kind: r.kind,
        items: r.items || [],
        total: r.total,
        datetime: r.createdAt,
        voidReason: (r as any).voidReason || null,
        voidReviewedAt: (r as any).voidReviewedAt || null,
      })),
  };

  // --- Sales remittance (cash on hand counted by staff vs sales recorded in the system) ---
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const activeRemits = remittances.filter((r: any) => !r.voided);
  const voidedRemits = remittances.filter((r: any) => r.voided);

  const salesByDay: Record<string, number> = {};
  for (const r of receipts) {
    const key = dayKey(new Date(r.createdAt), utcOffset);
    salesByDay[key] = (salesByDay[key] || 0) + r.total;
  }
  const remitByDay: Record<string, { remitted: number; count: number }> = {};
  const denomTotals: Record<string, number> = {};
  for (const r of activeRemits as any[]) {
    if (!remitByDay[r.businessDate]) remitByDay[r.businessDate] = { remitted: 0, count: 0 };
    remitByDay[r.businessDate].remitted += r.totalCash;
    remitByDay[r.businessDate].count += 1;
    for (const d of r.denominations || []) denomTotals[d.key] = (denomTotals[d.key] || 0) + d.count;
  }
  const activeEpays = epayments.filter((p: any) => !p.voided);
  const voidedEpays = epayments.filter((p: any) => p.voided);
  const epayByDay: Record<string, { amount: number; count: number }> = {};
  const epayByProvider: Record<string, { count: number; amount: number }> = {};
  for (const p of activeEpays as any[]) {
    if (!epayByDay[p.businessDate]) epayByDay[p.businessDate] = { amount: 0, count: 0 };
    epayByDay[p.businessDate].amount += p.amount;
    epayByDay[p.businessDate].count += 1;
    if (!epayByProvider[p.provider]) epayByProvider[p.provider] = { count: 0, amount: 0 };
    epayByProvider[p.provider].count += 1;
    epayByProvider[p.provider].amount += p.amount;
  }

  // Expenses: only those paid from the drawer ("cash") reduce the cash expected on hand.
  const activeExpenses = expenseDocs.filter((x: any) => !x.voided);
  const voidedExpenses = expenseDocs.filter((x: any) => x.voided);
  const expByDay: Record<string, { cash: number; other: number; count: number }> = {};
  const expByCategory: Record<string, { count: number; amount: number }> = {};
  for (const x of activeExpenses as any[]) {
    if (!expByDay[x.businessDate]) expByDay[x.businessDate] = { cash: 0, other: 0, count: 0 };
    expByDay[x.businessDate][x.paidFrom === "other" ? "other" : "cash"] += x.amount;
    expByDay[x.businessDate].count += 1;
    if (!expByCategory[x.category]) expByCategory[x.category] = { count: 0, amount: 0 };
    expByCategory[x.category].count += 1;
    expByCategory[x.category].amount += x.amount;
  }

  const allDays = Array.from(new Set([...Object.keys(salesByDay), ...Object.keys(remitByDay), ...Object.keys(epayByDay), ...Object.keys(expByDay)])).sort().reverse();
  const remitTotal = round2(activeRemits.reduce((s: number, r: any) => s + r.totalCash, 0));
  const epayTotal = round2(activeEpays.reduce((s: number, p: any) => s + p.amount, 0));
  const collectedTotal = round2(remitTotal + epayTotal);
  const salesTotal = round2(receipts.reduce((s, r) => s + r.total, 0));
  const expCashTotal = round2(activeExpenses.filter((x: any) => x.paidFrom !== "other").reduce((s: number, x: any) => s + x.amount, 0));
  const expOtherTotal = round2(activeExpenses.filter((x: any) => x.paidFrom === "other").reduce((s: number, x: any) => s + x.amount, 0));

  const serializeRemit = (r: any) => ({
    id: String(r._id),
    businessDate: r.businessDate,
    totalCash: r.totalCash,
    billsTotal: r.billsTotal || 0,
    coinsTotal: r.coinsTotal || 0,
    denominations: r.denominations || [],
    remarks: r.remarks || "",
    submittedBy: r.submittedByName || "Unknown",
    datetime: r.createdAt,
    voidStatus: r.voidStatus || "none",
    voidReason: r.voidReason || null,
    voidRequestedBy: r.voidRequestedBy?.name || null,
    voidReviewedBy: r.voidReviewedBy?.name || null,
    voidReviewedAt: r.voidReviewedAt || null,
  });

  const serializeEpay = (p: any) => ({
    id: String(p._id),
    businessDate: p.businessDate,
    provider: p.provider,
    providerLabel: p.providerLabel,
    amount: p.amount,
    referenceNo: p.referenceNo || "",
    payerName: p.payerName || "",
    senderAccount: p.senderAccount || "",
    notes: p.notes || "",
    recordedBy: p.recordedByName || "Unknown",
    datetime: p.createdAt,
    voidStatus: p.voidStatus || "none",
    voidReason: p.voidReason || null,
    voidRequestedBy: p.voidRequestedBy?.name || null,
    voidReviewedBy: p.voidReviewedBy?.name || null,
    voidReviewedAt: p.voidReviewedAt || null,
  });

  const remittance = {
    totalRemitted: remitTotal,          // cash only
    totalEpayments: epayTotal,
    totalCollected: collectedTotal,     // cash + e-payments
    totalRecordedSales: salesTotal,
    totalExpensesCash: expCashTotal,
    // Cash paid out for expenses legitimately leaves the drawer, so it's added back:
    // difference = cash counted + e-payments + cash expenses − recorded sales
    variance: cashBalance(salesTotal, epayTotal, expCashTotal, remitTotal).difference,
    count: activeRemits.length,
    epaymentCount: activeEpays.length,
    daysRemitted: Object.keys(remitByDay).length,
    // A day with sales but nothing collected (no cash count and no e-payments logged)
    daysWithSalesNotRemitted: allDays.filter((d) => salesByDay[d] && !remitByDay[d] && !epayByDay[d]).length,
    pendingVoids:
      activeRemits.filter((r: any) => r.voidStatus === "pending").length +
      activeEpays.filter((p: any) => p.voidStatus === "pending").length,
    byDay: allDays.map((date) => {
      const remitted = round2(remitByDay[date]?.remitted || 0);
      const epay = round2(epayByDay[date]?.amount || 0);
      const collected = round2(remitted + epay);
      const sales = round2(salesByDay[date] || 0);
      const expenses = round2(expByDay[date]?.cash || 0);
      return {
        date, remitted, epay, collected, sales, expenses,
        variance: cashBalance(sales, epay, expenses, remitted).difference,
        count: remitByDay[date]?.count || 0,
        epayCount: epayByDay[date]?.count || 0,
      };
    }),
    epayByProvider: EPAY_PROVIDERS
      .filter((p) => epayByProvider[p.key])
      .map((p) => ({ key: p.key, label: p.label, count: epayByProvider[p.key].count, amount: round2(epayByProvider[p.key].amount) }))
      .sort((a, b) => b.amount - a.amount),
    epayments: activeEpays.map(serializeEpay),
    voidedEpayments: voidedEpays.map(serializeEpay),
    denominations: PESO_DENOMINATIONS.map((d) => ({
      key: d.key,
      label: d.label,
      type: d.type,
      value: d.value,
      count: denomTotals[d.key] || 0,
      amount: round2((Math.round(d.value * 100) * (denomTotals[d.key] || 0)) / 100),
    })),
    records: activeRemits.map(serializeRemit),
    voided: voidedRemits.map(serializeRemit),
  };

  const serializeExp = (x: any) => ({
    id: String(x._id),
    businessDate: x.businessDate,
    category: x.category,
    categoryLabel: x.categoryLabel,
    amount: x.amount,
    description: x.description || "",
    paidTo: x.paidTo || "",
    receiptNo: x.receiptNo || "",
    paidFrom: x.paidFrom || "cash",
    recordedBy: x.recordedByName || "Unknown",
    datetime: x.createdAt,
    voidStatus: x.voidStatus || "none",
    voidReason: x.voidReason || null,
    voidRequestedBy: x.voidRequestedBy?.name || null,
    voidReviewedBy: x.voidReviewedBy?.name || null,
    voidReviewedAt: x.voidReviewedAt || null,
  });

  // --- Expenses & cash on hand balance ---
  const periodBalance = cashBalance(salesTotal, epayTotal, expCashTotal, remitTotal);
  const expenses = {
    total: round2(expCashTotal + expOtherTotal),
    totalCash: expCashTotal,     // paid from the drawer
    totalOther: expOtherTotal,   // paid outside the drawer
    count: activeExpenses.length,
    pendingVoids: activeExpenses.filter((x: any) => x.voidStatus === "pending").length,
    balance: {
      sales: salesTotal,
      epayments: epayTotal,
      cashSales: periodBalance.cashSales,
      expensesCash: expCashTotal,
      expectedCash: periodBalance.expectedCash,
      counted: remitTotal,
      difference: periodBalance.difference,
      // Days where money moved (sales or cash expenses) but nobody counted the drawer
      daysNotCounted: allDays.filter((d) => !remitByDay[d] && (salesByDay[d] || expByDay[d]?.cash)).length,
    },
    byDay: allDays.map((date) => {
      const sales = round2(salesByDay[date] || 0);
      const epay = round2(epayByDay[date]?.amount || 0);
      const expensesCash = round2(expByDay[date]?.cash || 0);
      const expensesOther = round2(expByDay[date]?.other || 0);
      const counted = round2(remitByDay[date]?.remitted || 0);
      const b = cashBalance(sales, epay, expensesCash, counted);
      return {
        date, sales, epay, cashSales: b.cashSales, expensesCash, expensesOther,
        expenseCount: expByDay[date]?.count || 0,
        expectedCash: b.expectedCash, counted, difference: b.difference,
        counts: remitByDay[date]?.count || 0,
      };
    }),
    byCategory: EXPENSE_CATEGORIES
      .filter((c) => expByCategory[c.key])
      .map((c) => ({ key: c.key, label: c.label, count: expByCategory[c.key].count, amount: round2(expByCategory[c.key].amount) }))
      .sort((a, b) => b.amount - a.amount),
    records: activeExpenses.map(serializeExp),
    voided: voidedExpenses.map(serializeExp),
  };

  return {
    period,
    remittance,
    expenses,
    range: { start, end },
    gymGoers,
    checkinList,
    checkinSales,
    inventorySales,
    membershipSales,
    voided,
    registeredMembers: undefined,
  };
});
