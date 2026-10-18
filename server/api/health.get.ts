import { pingDB } from "../utils/db";

// Lightweight health check. Point DigitalOcean's HTTP health check here so the
// platform itself keeps the app and database connection warm.
export default defineEventHandler(async (event) => {
  const started = Date.now();
  try {
    await pingDB();
    return { ok: true, db: "up", ms: Date.now() - started };
  } catch (err: any) {
    setResponseStatus(event, 503);
    return { ok: false, db: "down", error: err?.message };
  }
});
