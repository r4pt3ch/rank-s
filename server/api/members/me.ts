import Member from "../../utils/models/Member";
import { connectDB } from "../../utils/db";
import { requireUser } from "../../utils/auth";
import { getThresholds, rankFromPoints, membershipStatus } from "../../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const session = await requireUser(event);
  if (session.role !== "member") {
    throw createError({ statusCode: 403, statusMessage: "Only gym member accounts can access this." });
  }

  const method = event.method;
  const thresholds = await getThresholds();

  if (method === "GET") {
    const member = await Member.findById(session.memberId).lean();
    if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });
    return {
      id: String(member._id),
      firstName: member.firstName,
      lastName: member.lastName,
      name: member.name,
      email: member.email,
      phone: member.phone,
      address: member.address,
      dob: member.dob,
      points: member.points,
      rank: rankFromPoints(member.points, thresholds),
      thresholds,
      membershipCategory: member.membershipCategory,
      membershipDuration: member.membershipDuration,
      membershipStart: member.membershipStart,
      membershipExpiry: member.membershipExpiry,
      membershipStatus: membershipStatus(member),
    };
  }

  if (method === "PUT") {
    const body = await readBody(event);
    const allowed = ["firstName", "lastName", "email", "phone", "address", "dob"];
    const patch: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    if (patch.firstName !== undefined || patch.lastName !== undefined) {
      const current = await Member.findById(session.memberId);
      if (!current) throw createError({ statusCode: 404, statusMessage: "Member not found." });
      const firstName = patch.firstName !== undefined ? String(patch.firstName).trim() : current.firstName;
      const lastName = patch.lastName !== undefined ? String(patch.lastName).trim() : current.lastName;
      patch.firstName = firstName;
      patch.lastName = lastName;
      patch.name = `${firstName} ${lastName}`;
    }

    const member = await Member.findByIdAndUpdate(session.memberId, patch, { new: true });
    if (!member) throw createError({ statusCode: 404, statusMessage: "Member not found." });
    return {
      id: String(member._id),
      firstName: member.firstName,
      lastName: member.lastName,
      name: member.name,
      email: member.email,
      phone: member.phone,
      address: member.address,
      dob: member.dob,
      points: member.points,
      rank: rankFromPoints(member.points, thresholds),
      membershipCategory: member.membershipCategory,
      membershipDuration: member.membershipDuration,
      membershipStart: member.membershipStart,
      membershipExpiry: member.membershipExpiry,
      membershipStatus: membershipStatus(member),
    };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
