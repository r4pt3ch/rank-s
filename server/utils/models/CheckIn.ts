import mongoose, { Schema } from "mongoose";

const ServiceItemSchema = new Schema(
  { name: { type: String, required: true }, price: { type: Number, required: true } },
  { _id: false }
);

const CheckInSchema = new Schema(
  {
    member:        { type: Schema.Types.ObjectId, ref: "Member", default: null },
    name:          { type: String, required: true },
    type:          { type: String, enum: ["member", "walkin"], required: true },
    rank:          { type: String, default: null },
    pointsAwarded: { type: Number, default: 0 },
    fee:           { type: Number, default: 0 },
    billedAs:      { type: String, enum: ["member", "walkin"], default: "walkin" },
    expiredBilling:{ type: Boolean, default: false },
    duplicateVisit:{ type: Boolean, default: false },
    visitType:     { type: String, enum: ["daily", "weekly", "monthly", null], default: null },
    // Void / modification request
    voided:              { type: Boolean, default: false },
    voidStatus:          { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
    voidReason:          { type: String, default: null },
    voidRequestedBy:     { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidRequestedAt:     { type: Date, default: null },
    voidReviewedBy:      { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidReviewedAt:      { type: Date, default: null },
    voidRejectionReason: { type: String, default: null },
    services:      { type: [ServiceItemSchema], default: [] }, // services added at check-in
    servicesTotal: { type: Number, default: 0 },
    receipt:       { type: Schema.Types.ObjectId, ref: "Receipt", default: null },
    issuedBy:      { type: Schema.Types.ObjectId, ref: "User", default: null },
    source:        { type: String, enum: ["staff", "kiosk"], default: "staff" },
  },
  { timestamps: true }
);

export default mongoose.models.CheckIn || mongoose.model("CheckIn", CheckInSchema);
