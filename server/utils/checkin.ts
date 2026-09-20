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

function tierLabel(tier: string) {
  return { walkin: "Walk-In", regular: "Regular", elite: "Elite" }[tier] || tier;
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
  walkinStudentType?: "student" | "non-student";
  visitType?: "daily" | "weekly"; // for members with subscriptions
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
    // Auto-resume paused subscription on check-in
    if (member.membershipPaused && member.membershipPausedAt) {
      const pausedMs = Date.now() - new Date(member.membershipPausedAt).getTime();
      const pausedDays = Math.ceil(pausedMs / (1000 * 60 * 60 * 24));
      if (member.membershipExpiry) {
        const newExpiry = new Date(member.membershipExpiry);
        newExpiry.setDate(newExpiry.getDate() + pausedDays);
        newExpiry.setHours(23, 59, 59, 999);
        member.membershipExpiry = newExpiry;
      }
      member.membershipPaused = false;
      member.membershipResumedAt = new Date();
      member.membershipPausedDays = (member.membershipPausedDays || 0) + pausedDays;
      await member.save();
      await logAudit(
        opts.issuedBy || { name: opts.source === "kiosk" ? "Kiosk" : "system" },
        `Auto-resumed subscription for "${member.name}" on check-in (paused ${pausedDays} day${pausedDays === 1 ? "" : "s"}, expiry extended)`
      );
    }

    const alreadyToday = await CheckIn.findOne({
      member: member._id,
      type: "member",
      createdAt: { $gte: startOfToday() },
    }).lean();

    const currentRank = rankFromPoints(member.points, thresholds);

    if (alreadyToday) {
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
        `Repeat same-day check-in for "${member.name}" — no charge`
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
        studentType: member.membershipStudentType || "non-student",
      };
    }

    const oldRank = currentRank;
    member.points += settings.pointsPerCheckIn;
    await member.save();
    const newRank = rankFromPoints(member.points, thresholds);

    const status = membershipStatus(member);
    const studentType: string = member.membershipStudentType || "non-student";
    let fee = 0;
    let billedAs: "member" | "walkin" = "member";
    let expiredBilling = false;
    let feeLabel = `Gym visit fee - ${member.name}`;

    if (status === "expired") {
      // expired → charge walk-in rate based on their student type
      fee = studentType === "student" ? settings.walkInFeeStudent : settings.walkInFeeNonStudent;
      billedAs = "walkin";
      expiredBilling = true;
      feeLabel = `Gym visit (expired membership, billed as walk-in ${studentType}) - ${member.name}`;
    } else if (status === "active") {
      const tier = member.membershipTier || member.membershipCategory;
      if (tier && member.membershipDuration) {
        const plan = await getMembershipPlan(tier, member.membershipDuration, studentType);
        const visitType = opts.visitType || "daily";
        fee = visitType === "weekly" ? (plan?.weeklyFee || 0) : (plan?.dailyFee || 0);
        billedAs = "member";
        feeLabel = `Gym visit fee (${tierLabel(tier)} / ${studentType} / ${visitType}) - ${member.name}`;
      }
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
      visitType: opts.visitType || null,
      receipt: receiptId,
      issuedBy: opts.issuedBy?.id || null,
      source: opts.source,
    });

    await logAudit(
      opts.issuedBy || { name: opts.source === "kiosk" ? "Kiosk" : "system" },
      `Checked in "${member.name}" (${studentType})${opts.source === "kiosk" ? " via kiosk" : ""} (+${settings.pointsPerCheckIn} pts${fee > 0 ? `, fee ₱${fee}` : ""})`
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
      studentType,
    };
  }

  // walk-in — staff selects student or non-student
  const name = opts.walkinName || "Walk-in guest";
  const walkinStudentType = opts.walkinStudentType || "non-student";
  const fee = walkinStudentType === "student" ? settings.walkInFeeStudent : settings.walkInFeeNonStudent;

  let receiptId = null;
  if (fee > 0) {
    const receipt = await Receipt.create({
      name,
      items: [{ name: `Walk-in entrance fee (${walkinStudentType}) - ${name}`, price: fee, qty: 1 }],
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
    `Walk-in check-in: "${name}" (${walkinStudentType}) (fee ₱${fee})`
  );

  return { id: String(checkin._id), name, rank: null, fee, billedAs: "walkin", duplicateVisit: false, studentType: walkinStudentType };
}
