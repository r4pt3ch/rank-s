import Settings from "../utils/models/Settings";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";
import { logAudit } from "../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin"]);
    let doc = await Settings.findOne({ key: "default" });
    if (!doc) doc = await Settings.create({ key: "default" });
    return { pointsPerCheckIn: doc.pointsPerCheckIn, walkInFee: doc.walkInFee };
  }

  if (method === "PUT") {
    const user = await requireRole(event, ["superadmin"]);
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

    if (body.walkInFee !== undefined) {
      const fee = Number(body.walkInFee);
      if (!Number.isFinite(fee) || fee < 0) {
        throw createError({ statusCode: 400, statusMessage: "Walk-in fee must be a non-negative number." });
      }
      doc.walkInFee = fee;
      changes.push(`walk-in fee to ₱${fee}`);
    }

    await doc.save();
    if (changes.length) await logAudit(user, `Set ${changes.join(" and ")}`);
    return { pointsPerCheckIn: doc.pointsPerCheckIn, walkInFee: doc.walkInFee };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
