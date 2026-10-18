import mongoose, { Schema } from "mongoose";

const DenominationCountSchema = new Schema(
  {
    key:   { type: String, required: true },  // e.g. "b1000", "c025"
    value: { type: Number, required: true },  // face value in pesos
    type:  { type: String, enum: ["bill", "coin"], required: true },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// A saved cash-on-hand count for a business day. Saved records are never edited —
// corrections go through a void request that only a super admin can approve.
const RemittanceSchema = new Schema(
  {
    businessDate:  { type: String, required: true, index: true }, // YYYY-MM-DD in gym local time
    denominations: { type: [DenominationCountSchema], default: [] },
    totalCash:     { type: Number, required: true },
    billsTotal:    { type: Number, default: 0 },
    coinsTotal:    { type: Number, default: 0 },
    remarks:       { type: String, default: "" },
    submittedBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByName: { type: String, default: "" },

    voided:              { type: Boolean, default: false },
    voidStatus:          { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
    voidReason:          { type: String, default: null },
    voidRequestedBy:     { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidRequestedAt:     { type: Date, default: null },
    voidReviewedBy:      { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidReviewedAt:      { type: Date, default: null },
    voidRejectionReason: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Remittance || mongoose.model("Remittance", RemittanceSchema);
