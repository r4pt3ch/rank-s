import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/rank-s";

const UserSchema = new mongoose.Schema(
  { username: String, passwordHash: String, name: String, email: String, role: String },
  { timestamps: true }
);
const MemberSchema = new mongoose.Schema(
  {
    firstName: String, lastName: String, name: String, email: String, phone: String, address: String, dob: String,
    qr: String, barcode: String, pin: String, points: Number, joinDate: Date,
    membershipCategory: String, membershipDuration: String, membershipStart: Date, membershipExpiry: Date,
  },
  { timestamps: true }
);
const ProductSchema = new mongoose.Schema(
  { name: String, price: Number, stock: Number, category: String },
  { timestamps: true }
);
const ThresholdSchema = new mongoose.Schema({ key: String, values: { type: Map, of: Number } });
const SettingsSchema = new mongoose.Schema({ key: String, pointsPerCheckIn: Number, walkInFee: Number });
const ReceiptSettingsSchema = new mongoose.Schema({
  key: String, gymName: String, address: String, phone: String, footerMessage: String,
  showLogo: Boolean, showAddress: Boolean, showPhone: Boolean, showReceiptNumber: Boolean,
  showDateTime: Boolean, showCashier: Boolean, showItemizedList: Boolean, showFooterMessage: Boolean,
});
const MembershipPlanSchema = new mongoose.Schema(
  { category: String, duration: String, price: Number, visitFee: Number },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
const Member = mongoose.model("Member", MemberSchema);
const Product = mongoose.model("Product", ProductSchema);
const Threshold = mongoose.model("Threshold", ThresholdSchema);
const Settings = mongoose.model("Settings", SettingsSchema);
const ReceiptSettings = mongoose.model("ReceiptSettings", ReceiptSettingsSchema);
const MembershipPlan = mongoose.model("MembershipPlan", MembershipPlanSchema);

function genCode(prefix) {
  const rand = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${rand()}${rand()}`;
}
function genPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to", MONGODB_URI);

  await User.deleteMany({});
  await Member.deleteMany({});
  await Product.deleteMany({});
  await Threshold.deleteMany({});
  await Settings.deleteMany({});
  await ReceiptSettings.deleteMany({});
  await MembershipPlan.deleteMany({});

  await User.create([
    { username: "super", passwordHash: await bcrypt.hash("super123", 10), name: "Admin Reyes", email: "", role: "superadmin" },
    { username: "admin", passwordHash: await bcrypt.hash("admin123", 10), name: "Front Desk - Jen", email: "", role: "admin" },
  ]);

  const now = new Date();

  function genUniquePinSync(used) {
    let pin;
    do {
      pin = genPin();
    } while (used.has(pin));
    used.add(pin);
    return pin;
  }
  const usedPins = new Set();

  await Member.create([
    {
      firstName: "Marco", lastName: "Dela Cruz", name: "Marco Dela Cruz",
      email: "marco@example.com", phone: "0917 555 0142", address: "Quezon City", dob: "1996-04-12",
      qr: genCode("QR"), barcode: genCode("BC"), pin: genUniquePinSync(usedPins), points: 410, joinDate: now,
      membershipCategory: "regular", membershipDuration: "monthly", membershipStart: now, membershipExpiry: addMonths(now, 1),
    },
    {
      firstName: "Sofia", lastName: "Reyes", name: "Sofia Reyes",
      email: "sofia@example.com", phone: "0918 222 8851", address: "Mandaluyong", dob: "1999-09-03",
      qr: genCode("QR"), barcode: genCode("BC"), pin: genUniquePinSync(usedPins), points: 1180, joinDate: now,
      membershipCategory: "student", membershipDuration: "sixmonth", membershipStart: now, membershipExpiry: addMonths(now, 6),
    },
    {
      firstName: "Liam", lastName: "Tan", name: "Liam Tan",
      email: "liam@example.com", phone: "0920 781 3320", address: "Pasig", dob: "2001-11-29",
      qr: genCode("QR"), barcode: genCode("BC"), pin: genUniquePinSync(usedPins), points: 60, joinDate: now,
      // intentionally expired, to demo the expired-membership / billed-as-walk-in flow
      membershipCategory: "regular", membershipDuration: "monthly", membershipStart: addMonths(now, -2), membershipExpiry: addMonths(now, -1),
    },
  ]);

  await Product.create([
    { name: "Whey Protein 1kg", price: 1850, stock: 14, category: "Supplement" },
    { name: "Rank S Tank Top", price: 650, stock: 22, category: "Apparel" },
    { name: "Shaker Bottle", price: 320, stock: 30, category: "Accessory" },
    { name: "Energy Drink", price: 85, stock: 48, category: "Beverage" },
    { name: "Lifting Straps", price: 420, stock: 9, category: "Accessory" },
  ]);

  await Threshold.create({
    key: "default",
    values: { F: 0, E: 50, D: 120, C: 220, B: 350, A: 520, S: 750, SS: 1050, SSS: 1500 },
  });

  await Settings.create({ key: "default", pointsPerCheckIn: 20, walkInFee: 50 });

  await ReceiptSettings.create({
    key: "default",
    gymName: "Rank S Fitness Gym",
    address: "123 Shield Avenue, Quezon City",
    phone: "0917 000 0000",
    footerMessage: "Thank you for training with us!",
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showReceiptNumber: true,
    showDateTime: true,
    showCashier: true,
    showItemizedList: true,
    showFooterMessage: true,
  });

  await MembershipPlan.create([
    { category: "student", duration: "monthly", price: 800, visitFee: 30 },
    { category: "student", duration: "sixmonth", price: 4200, visitFee: 30 },
    { category: "student", duration: "yearly", price: 7800, visitFee: 30 },
    { category: "student", duration: "lifetime", price: 18000, visitFee: 30 },

    { category: "regular", duration: "monthly", price: 1200, visitFee: 50 },
    { category: "regular", duration: "sixmonth", price: 6300, visitFee: 50 },
    { category: "regular", duration: "yearly", price: 11500, visitFee: 50 },
    { category: "regular", duration: "lifetime", price: 25000, visitFee: 50 },

    { category: "senior", duration: "monthly", price: 700, visitFee: 25 },
    { category: "senior", duration: "sixmonth", price: 3700, visitFee: 25 },
    { category: "senior", duration: "yearly", price: 6800, visitFee: 25 },
    { category: "senior", duration: "lifetime", price: 16000, visitFee: 25 },
  ]);

  console.log("Seed complete.");
  console.log("Super admin login: super / super123");
  console.log("Regular admin login: admin / admin123");
  const sample = await Member.find().lean();
  console.log("Sample member PINs:", sample.map((m) => `${m.name}: ${m.pin}`));
  console.log("Note: Liam Tan's membership is seeded as already expired, to demo the expired-billing flow.");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
