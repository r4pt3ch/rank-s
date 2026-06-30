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
    return {
      lobbyAutoClearEnabled: doc.lobbyAutoClearEnabled,
      lobbyDisplayMinutes: doc.lobbyDisplayMinutes,
      lobbyResetAt: doc.lobbyResetAt,
    };
  }

  if (method === "PUT") {
    const user = await requireRole(event, ["superadmin", "admin"]);
    const body = await readBody(event);
    let doc = await Settings.findOne({ key: "default" });
    if (!doc) doc = await Settings.create({ key: "default" });

    const changes: string[] = [];

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

    await doc.save();
    if (changes.length) await logAudit(user, `Set ${changes.join(", ")}`);
    return {
      lobbyAutoClearEnabled: doc.lobbyAutoClearEnabled,
      lobbyDisplayMinutes: doc.lobbyDisplayMinutes,
      lobbyResetAt: doc.lobbyResetAt,
    };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
