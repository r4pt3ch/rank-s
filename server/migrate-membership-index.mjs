import mongoose from "mongoose";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1); }

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to", MONGODB_URI.replace(/:([^@]+)@/, ":****@"));

  const col = mongoose.connection.collection("membershipplans");

  // List current indexes so we can see what's there
  const indexes = await col.indexes();
  console.log("Current indexes:", indexes.map((i) => i.name));

  // Drop every index except _id — Mongoose will recreate the correct ones on next boot
  for (const idx of indexes) {
    if (idx.name === "_id_") continue;
    try {
      await col.dropIndex(idx.name);
      console.log("Dropped:", idx.name);
    } catch (e) {
      console.log("Could not drop", idx.name, "—", e.message);
    }
  }

  console.log("Done. Remaining indexes:", (await col.indexes()).map((i) => i.name));
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
