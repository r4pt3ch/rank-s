import Settings from "./models/Settings";
import Receipt from "./models/Receipt";
import { getTodayRange } from "./helpers";

export async function getUtcOffset() {
  const s = await Settings.findOne({ key: "default" }).select("utcOffset").lean();
  return (s as any)?.utcOffset ?? 8;
}

// YYYY-MM-DD for a moment, in the gym's local time.
export function gymDayKey(date: Date, utcOffset: number) {
  return new Date(date.getTime() + utcOffset * 3600000).toISOString().slice(0, 10);
}

// Sum of all non-voided receipts (check-in fees, POS, memberships) for today.
export async function todaysRecordedSales(utcOffset: number) {
  const { start, end } = getTodayRange(utcOffset);
  const rows = await Receipt.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, voided: { $ne: true } } },
    { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
  ]);
  return { total: rows[0]?.total || 0, count: rows[0]?.count || 0 };
}

export function serializeEPayment(p: any) {
  return {
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
    createdAt: p.createdAt,
    voided: !!p.voided,
    voidStatus: p.voidStatus || "none",
    voidReason: p.voidReason || null,
    voidRequestedAt: p.voidRequestedAt || null,
    voidRequestedBy: p.voidRequestedBy?.name || null,
    voidReviewedAt: p.voidReviewedAt || null,
    voidReviewedBy: p.voidReviewedBy?.name || null,
    voidRejectionReason: p.voidRejectionReason || null,
  };
}

export function serializeRemittance(r: any) {
  return {
    id: String(r._id),
    businessDate: r.businessDate,
    denominations: r.denominations || [],
    totalCash: r.totalCash,
    billsTotal: r.billsTotal || 0,
    coinsTotal: r.coinsTotal || 0,
    remarks: r.remarks || "",
    submittedBy: r.submittedByName || r.submittedBy?.name || "Unknown",
    createdAt: r.createdAt,
    voided: !!r.voided,
    voidStatus: r.voidStatus || "none",
    voidReason: r.voidReason || null,
    voidRequestedAt: r.voidRequestedAt || null,
    voidRequestedBy: r.voidRequestedBy?.name || null,
    voidReviewedAt: r.voidReviewedAt || null,
    voidReviewedBy: r.voidReviewedBy?.name || null,
    voidRejectionReason: r.voidRejectionReason || null,
  };
}
