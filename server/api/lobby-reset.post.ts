import Settings from "../utils/models/Settings";
import { connectDB } from "../utils/db";
import { requireRole } from "../utils/auth";
import { logAudit } from "../utils/helpers";

export default defineEventHandler(async (event) => {
  await connectDB();
  const user = await requireRole(event, ["superadmin", "admin"]);

  let doc = await Settings.findOne({ key: "default" });
  if (!doc) doc = await Settings.create({ key: "default" });

  doc.lobbyResetAt = new Date();
  await doc.save();

  await logAudit(user, "Manually cleared the lobby display");
  return { lobbyResetAt: doc.lobbyResetAt };
});
