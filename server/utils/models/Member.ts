import mongoose, { Schema } from "mongoose";

const MemberSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    name: { type: String, required: true }, // derived: `${firstName} ${lastName}`, kept for search/display/checkin convenience
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    dob: { type: String, default: "" },
    qr: { type: String, required: true, unique: true },
    barcode: { type: String, required: true, unique: true },
    pin: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    joinDate: { type: Date, default: () => new Date() },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },

    // free text so admins can define their own membership categories, not locked to a fixed list
    membershipCategory: { type: String, default: null },
    membershipDuration: { type: String, enum: ["monthly", "sixmonth", "yearly", "lifetime", null], default: null },
    membershipStart: { type: Date, default: null },
    membershipExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Member || mongoose.model("Member", MemberSchema);
