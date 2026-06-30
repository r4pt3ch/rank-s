import Threshold, { RANKS } from "../utils/models/Threshold";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";
import { logAudit } from "../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const method = event.method;

  if (method === "GET") {
    await requireRole(event, ["superadmin", "admin", "member"]);
    let doc = await Threshold.findOne({ key: "default" });
    if (!doc) doc = await Threshold.create({ key: "default" });
    const values: Record<string, number> = {};
    for (const r of RANKS) values[r] = doc.values.get(r) ?? 0;
    return values;
  }

  if (method === "PUT") {
    const user = await requireRole(event, ["superadmin"]);
    const body = await readBody(event);
    let doc = await Threshold.findOne({ key: "default" });
    if (!doc) doc = await Threshold.create({ key: "default" });
    for (const r of RANKS) {
      if (body[r] !== undefined) doc.values.set(r, Number(body[r]));
    }
    await doc.save();
    await logAudit(user, "Updated rank point thresholds");
    const values: Record<string, number> = {};
    for (const r of RANKS) values[r] = doc.values.get(r) ?? 0;
    return values;
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
