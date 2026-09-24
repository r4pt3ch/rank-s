import mongoose, { Schema } from "mongoose";

const ReceiptItemSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
  },
  { _id: false }
);

const ReceiptSchema = new Schema(
  {
    name: { type: String, required: true },
    items: { type: [ReceiptItemSchema], default: [] },
    total: { type: Number, required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User" },
    // 'pos' = POS product sale, 'visit' = automatic check-in visit fee, 'membership' = plan purchase/renewal
    kind: { type: String, enum: ["pos", "visit", "membership"], default: "pos" },
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

export default mongoose.models.Receipt || mongoose.model("Receipt", ReceiptSchema);
