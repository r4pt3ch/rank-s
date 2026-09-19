import mongoose from "mongoose";

let cached = global.__rankS_mongoose;
if (!cached) {
  cached = global.__rankS_mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const config = useRuntimeConfig();
    cached.promise = mongoose
      .connect(config.mongodbUri, { dbName: undefined })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
