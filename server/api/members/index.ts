import Member from "../../utils/models/Member";
import { connectDB } from "../../utils/db";
import { requireRole } from "../../utils/auth";
import { getThresholds, rankFromPoints, genCode, genUniquePin, logAudit, membershipStatus } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin"]);
    const members = await Member.find().sort({ createdAt: -1 }).lean();
    const thresholds = await getThresholds();
    return members.map((m) => ({
      id: String(m._id),
      firstName: m.firstName,
      lastName: m.lastName,
      name: m.name,
      email: m.email,
      phone: m.phone,
      address: m.address,
      dob: m.dob,
      qr: m.qr,
      barcode: m.barcode,
      pin: m.pin,
      points: m.points,
      joinDate: m.joinDate,
      rank: rankFromPoints(m.points, thresholds),
      membershipCategory: m.membershipCategory,
      membershipDuration: m.membershipDuration,
      membershipStart: m.membershipStart,
      membershipExpiry: m.membershipExpiry,
      membershipStatus: membershipStatus(m),
    }));
  }

  if (method === "POST") {
    const user = await requireRole(event, ["superadmin", "admin"]);
    const body = await readBody(event);
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    if (!firstName || !lastName) {
      throw createError({ statusCode: 400, statusMessage: "First name and last name are required." });
    }
    const pin = await genUniquePin();
    const member = await Member.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: body.email || "",
      phone: body.phone || "",
      address: body.address || "",
      dob: body.dob || "",
      qr: genCode("QR"),
      barcode: genCode("BC"),
      pin,
      points: 0,
      createdBy: user.id,
    });
    await logAudit(user, `Created member account "${member.name}" with QR/Barcode/PIN`);
    return { id: String(member._id), ...member.toObject() };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
