import mongoose from "mongoose";
import { connectDB, pingDB } from "../utils/db";

// Opens the database connection when the server boots (instead of on the first
// login), then pings it every few minutes so the connection never goes stale
// during quiet hours. This is what removes the long delay after inactivity.
const PING_EVERY_MS = 4 * 60 * 1000;

export default defineNitroPlugin((nitroApp) => {
  connectDB()
    .then(() => console.log("[db] connected on startup"))
    .catch((err) => console.error("[db] startup connect failed, will retry:", err?.message));

  mongoose.connection.on("disconnected", () => console.warn("[db] disconnected"));
  mongoose.connection.on("reconnected", () => console.log("[db] reconnected"));

  const timer = setInterval(() => {
    pingDB().catch((err) => console.warn("[db] keep-alive ping failed:", err?.message));
  }, PING_EVERY_MS);
  timer.unref?.();

  nitroApp.hooks.hook("close", () => clearInterval(timer));
});
