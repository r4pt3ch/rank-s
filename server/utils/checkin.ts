import CheckIn from "./models/CheckIn";
import Member from "./models/Member";
import Receipt from "./models/Receipt";
import {
  getThresholds,
  getSettings,
  rankFromPoints,
  membershipStatus,
  getMembershipPlan,
  logAudit,
} from "./helpers";

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function performCheckIn(opts: {
  memberId?: string;
  pin?: string;
  walkinName?: string;
  issuedBy?: { id?: string; name: string } | null;
  source: "staff" | "kiosk";
}) {
  const thresholds = await getThresholds();
  const settings = await getSettings();

  let member: any = null;
  if (opts.memberId) {
    member = await Member.findById(opts.memberId);
    if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });
  } else if (opts.pin) {
    member = await Member.findOne({ pin: opts.pin });
    if (!member) throw createError({ statusCode: 404, statusMessage: "No member found with that PIN." });
  }

  if (member) {
    const alreadyToday = await CheckIn.findOne({
      member: member._id,
      type: "member",
      createdAt: { $gte: startOfToday() },
    }).lean();

    const currentRank = rankFromPoints(member.points, thresholds);

    if (alreadyToday) {
      // Same member, same day - log the visit for the lobby/monitor, but don't charge again,
      // don't award points again, and exclude this entry from gym-goer reporting.
      const checkin = await CheckIn.create({
        member: member._id,
        name: member.name,
        type: "member",
        rank: currentRank,
        pointsAwarded: 0,
        fee: 0,
        billedAs: "member",
        expiredBilling: false,
        duplicateVisit: true,
        receipt: null,
        issuedBy: opts.issuedBy?.id || null,
        source: opts.source,
      });

      await logAudit(
        opts.issuedBy || { name: opts.source === "kiosk" ? "Kiosk" : "system" },
        `Logged repeat same-day check-in for member "${member.name}"${opts.source === "kiosk" ? " via kiosk" : ""} - no charge, not counted in reports`
      );

      return {
        id: String(checkin._id),
        name: member.name,
        rank: currentRank,
        points: member.points,
        leveledUp: false,
        fee: 0,
        billedAs: "member",
        expiredBilling: false,
        duplicateVisit: true,
        membershipStatus: membershipStatus(member),
      };
    }

    const oldRank = currentRank;
    member.points += settings.pointsPerCheckIn;
    await member.save();
    const newRank = rankFromPoints(member.points, thresholds);

    const status = membershipStatus(member);
    let fee = 0;
    let billedAs: "member" | "walkin" = "member";
    let expiredBilling = false;
    let feeLabel = `Gym visit fee - ${member.name}`;

    if (status === "expired") {
      fee = settings.walkInFee;
      billedAs = "walkin";
      expiredBilling = true;
      feeLabel = `Gym visit (expired membership, billed as walk-in) - ${member.name}`;
    } else if (status === "active" && member.membershipCategory && member.membershipDuration) {
      const plan = await getMembershipPlan(member.membershipCategory, member.membershipDuration);
      fee = plan?.visitFee || 0;
      billedAs = "member";
      feeLabel = `Gym visit fee (${categoryLabel(member.membershipCategory)}) - ${member.name}`;
    }

    let receiptId = null;
    if (fee > 0) {
      const receipt = await Receipt.create({
        name: member.name,
        items: [{ name: feeLabel, price: fee, qty: 1 }],
        total: fee,
        issuedBy: opts.issuedBy?.id || null,
        kind: "visit",
      });
      receiptId = receipt._id;
    }

    const checkin = await CheckIn.create({
      member: member._id,
      name: member.name,
      type: "member",
      rank: newRank,
      pointsAwarded: settings.pointsPerCheckIn,
      fee,
      billedAs,
      expiredBilling,
      duplicateVisit: false,
      receipt: receiptId,
      issuedBy: opts.issuedBy?.id || null,
      source: opts.source,
    });

    await logAudit(
      opts.issuedBy || { name: opts.source === "kiosk" ? "Kiosk" : "system" },
      `Checked in member "${member.name}"${opts.source === "kiosk" ? " via kiosk" : ""} (+${settings.pointsPerCheckIn} pts${fee > 0 ? `, fee ₱${fee}` : ""})`
    );

    return {
      id: String(checkin._id),
      name: member.name,
      rank: newRank,
      points: member.points,
      leveledUp: newRank !== oldRank,
      fee,
      billedAs,
      expiredBilling,
      duplicateVisit: false,
      membershipStatus: status,
    };
  }

  // walk-in
  const name = opts.walkinName || "Walk-in guest";
  const fee = settings.walkInFee;

  let receiptId = null;
  if (fee > 0) {
    const receipt = await Receipt.create({
      name,
      items: [{ name: `Walk-in entrance fee - ${name}`, price: fee, qty: 1 }],
      total: fee,
      issuedBy: opts.issuedBy?.id || null,
      kind: "visit",
    });
    receiptId = receipt._id;
  }

  const checkin = await CheckIn.create({
    member: null,
    name,
    type: "walkin",
    rank: null,
    fee,
    billedAs: "walkin",
    receipt: receiptId,
    issuedBy: opts.issuedBy?.id || null,
    source: opts.source,
  });

  await logAudit(
    opts.issuedBy || { name: opts.source === "kiosk" ? "Kiosk" : "system" },
    `Logged walk-in check-in for "${name}"${opts.source === "kiosk" ? " via kiosk" : ""} (fee ₱${fee})`
  );

  return { id: String(checkin._id), name, rank: null, fee, billedAs: "walkin", duplicateVisit: false };
}
