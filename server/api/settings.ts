import Settings from "../utils/models/Settings";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";
import { logAudit } from "../utils/helpers";

function serialize(doc: any) {
  return {
    pointsPerCheckIn:    doc.pointsPerCheckIn,
    walkInFeeStudent:    doc.walkInFeeStudent,
    walkInFeeNonStudent: doc.walkInFeeNonStudent,
    lobbyAutoClearEnabled: doc.lobbyAutoClearEnabled,
    lobbyDisplayMinutes:   doc.lobbyDisplayMinutes,
    lobbyResetAt:          doc.lobbyResetAt,
    utcOffset:             doc.utcOffset ?? 8,
    nonMemberWeeklyPassStudent:    doc.nonMemberWeeklyPassStudent ?? 0,
    nonMemberWeeklyPassNonStudent: doc.nonMemberWeeklyPassNonStudent ?? 0,
    nonMemberMonthlyPassStudent:   doc.nonMemberMonthlyPassStudent ?? 0,
    nonMemberMonthlyPassNonStudent:doc.nonMemberMonthlyPassNonStudent ?? 0,
  };
}

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin"]);
    let doc = await Settings.findOne({ key: "default" });
    if (!doc) doc = await Settings.create({ key: "default" });
    return serialize(doc);
  }

  if (method === "PUT") {
    const user = await requireRole(event, ["superadmin", "admin"]);
    const body = await readBody(event);
    let doc = await Settings.findOne({ key: "default" });
    if (!doc) doc = await Settings.create({ key: "default" });

    const changes: string[] = [];

    if (body.pointsPerCheckIn !== undefined) {
      const value = Number(body.pointsPerCheckIn);
      if (!Number.isFinite(value) || value < 0) {
        throw createError({ statusCode: 400, statusMessage: "Points per check-in must be a non-negative number." });
      }
      doc.pointsPerCheckIn = value;
      changes.push(`points per check-in to ${value}`);
    }

    if (body.walkInFeeStudent !== undefined) {
      const fee = Number(body.walkInFeeStudent);
      if (!Number.isFinite(fee) || fee < 0) throw createError({ statusCode: 400, statusMessage: "Walk-in fee must be a non-negative number." });
      doc.walkInFeeStudent = fee;
      changes.push(`student walk-in fee to ₱${fee}`);
    }

    if (body.walkInFeeNonStudent !== undefined) {
      const fee = Number(body.walkInFeeNonStudent);
      if (!Number.isFinite(fee) || fee < 0) throw createError({ statusCode: 400, statusMessage: "Walk-in fee must be a non-negative number." });
      doc.walkInFeeNonStudent = fee;
      changes.push(`non-student walk-in fee to ₱${fee}`);
    }

    if (body.lobbyAutoClearEnabled !== undefined) {
      doc.lobbyAutoClearEnabled = Boolean(body.lobbyAutoClearEnabled);
      changes.push(`lobby auto-clear ${doc.lobbyAutoClearEnabled ? "on" : "off"}`);
    }

    if (body.lobbyDisplayMinutes !== undefined) {
      const minutes = Number(body.lobbyDisplayMinutes);
      if (!Number.isFinite(minutes) || minutes < 1) {
        throw createError({ statusCode: 400, statusMessage: "Lobby display duration must be at least 1 minute." });
      }
      doc.lobbyDisplayMinutes = minutes;
      changes.push(`lobby display duration to ${minutes} min`);
    }
    if (body.utcOffset !== undefined) {
      doc.utcOffset = Number(body.utcOffset);
      changes.push(`timezone UTC${Number(body.utcOffset) >= 0 ? "+" : ""}${body.utcOffset}`);
    }
    const passFields = ["nonMemberWeeklyPassStudent","nonMemberWeeklyPassNonStudent","nonMemberMonthlyPassStudent","nonMemberMonthlyPassNonStudent"] as const;
    for (const f of passFields) {
      if (body[f] !== undefined) { (doc as any)[f] = Number(body[f]) || 0; }
    }

    await doc.save();
    if (changes.length) await logAudit(user, `Set ${changes.join(", ")}`);
    return serialize(doc);
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
