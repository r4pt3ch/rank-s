import Member from "../utils/models/Member";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";

export default defineEventHandler(async (event) => {
  await connectDB();
  await requireRole(event, ["superadmin", "admin"]);

  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);

  const members = await Member.find({
    membershipDuration: { $ne: "lifetime" },
    membershipExpiry: { $ne: null },
  })
    .select("name membershipExpiry membershipCategory membershipDuration")
    .lean();

  const expired = members
    .filter((m) => m.membershipExpiry && new Date(m.membershipExpiry) < now)
    .map((m) => ({ id: String(m._id), name: m.name, expiry: m.membershipExpiry }));

  const expiringSoon = members
    .filter((m) => m.membershipExpiry && new Date(m.membershipExpiry) >= now && new Date(m.membershipExpiry) <= soon)
    .map((m) => ({ id: String(m._id), name: m.name, expiry: m.membershipExpiry }));

  return { expired, expiringSoon };
});
