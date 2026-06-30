import mongoose, { Schema } from "mongoose";

const CheckInSchema = new Schema(
  {
    member: { type: Schema.Types.ObjectId, ref: "Member", default: null },
    name: { type: String, required: true },
    type: { type: String, enum: ["member", "walkin"], required: true },
    rank: { type: String, default: null },
    pointsAwarded: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
    billedAs: { type: String, enum: ["member", "walkin"], default: "walkin" },
    expiredBilling: { type: Boolean, default: false },
    duplicateVisit: { type: Boolean, default: false }, // true if this member already checked in earlier the same day - not charged, not counted in reports
    receipt: { type: Schema.Types.ObjectId, ref: "Receipt", default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, enum: ["staff", "kiosk"], default: "staff" },
  },
  { timestamps: true }
);

export default mongoose.models.CheckIn || mongoose.model("CheckIn", CheckInSchema);
