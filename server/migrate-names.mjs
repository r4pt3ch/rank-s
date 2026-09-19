import mongoose from "mongoose";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/rank-s";

const MemberSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    name: String,
    pin: String,
  },
  { strict: false } // don't choke on other fields we're not touching here
);

const Member = mongoose.model("Member", MemberSchema);

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return { firstName: "Member", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to", MONGODB_URI);

  const members = await Member.find({
    $or: [{ firstName: { $exists: false } }, { lastName: { $exists: false } }, { firstName: "" }],
  });

  console.log(`Found ${members.length} member(s) missing firstName/lastName.`);

  for (const m of members) {
    const { firstName, lastName } = splitName(m.name);
    m.firstName = firstName;
    m.lastName = lastName;
    await m.save();
    console.log(`Fixed "${m.name}" -> firstName="${firstName}" lastName="${lastName}"`);
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
