import mongoose from "mongoose";

// Shared across hot reloads / repeated imports.
let cached = global.__rankS_mongoose;
if (!cached) {
  cached = global.__rankS_mongoose = { conn: null, promise: null };
}

// Tuned so an idle app never sits on a dead socket:
// - maxIdleTimeMS closes pooled sockets before cloud NATs / Atlas silently drop them
// - minPoolSize keeps one fresh socket ready for the next request
// - short server-selection / connect timeouts fail fast and retry instead of hanging ~30s
const CONNECT_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 60_000,
  heartbeatFrequencyMS: 10_000,
  serverSelectionTimeoutMS: 8_000,
  connectTimeoutMS: 8_000,
  socketTimeoutMS: 45_000,
  family: 4, // skip slow IPv6 lookups on DigitalOcean
};

export async function connectDB() {
  // 1 = connected. Reuse it.
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

  if (!cached.promise) {
    const config = useRuntimeConfig();
    cached.promise = mongoose
      .connect(config.mongodbUri, CONNECT_OPTIONS)
      .then((m) => m)
      .catch((err) => {
        // Don't cache a failed attempt forever — let the next request retry.
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Cheap round-trip that keeps the pool alive and detects dead sockets early.
export async function pingDB() {
  await connectDB();
  await mongoose.connection.db!.admin().ping();
}
