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
  },
  { timestamps: true }
);

export default mongoose.models.Receipt || mongoose.model("Receipt", ReceiptSchema);
