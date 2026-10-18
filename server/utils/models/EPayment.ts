import mongoose, { Schema } from "mongoose";

// One electronic payment received (GCash, Maya, GoTyme, ...). Logged at the time it's
// received and never edited afterwards — mistakes go through a super-admin-approved void.
const EPaymentSchema = new Schema(
  {
    businessDate:  { type: String, required: true, index: true }, // YYYY-MM-DD in gym local time
    provider:      { type: String, required: true },              // key from EPAY_PROVIDERS
    providerLabel: { type: String, required: true },              // display name; custom text when provider = "other"
    amount:        { type: Number, required: true, min: 0.01 },
    referenceNo:   { type: String, default: "" },
    payerName:     { type: String, default: "" },
    senderAccount: { type: String, default: "" },                 // sender's number / account as shown on the receipt
    notes:         { type: String, default: "" },
    recordedBy:     { type: Schema.Types.ObjectId, ref: "User", required: true },
    recordedByName: { type: String, default: "" },

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

EPaymentSchema.index({ provider: 1, referenceNo: 1 });

export default mongoose.models.EPayment || mongoose.model("EPayment", EPaymentSchema);
