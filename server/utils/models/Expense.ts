import mongoose, { Schema } from "mongoose";

// One expense paid out during the business day. Logged when the money goes out and never
// edited afterwards — mistakes go through a super-admin-approved void, same as cash counts
// and e-payments.
const ExpenseSchema = new Schema(
  {
    businessDate:  { type: String, required: true, index: true }, // YYYY-MM-DD in gym local time
    category:      { type: String, required: true },              // key from EXPENSE_CATEGORIES
    categoryLabel: { type: String, required: true },
    amount:        { type: Number, required: true, min: 0.01 },
    description:   { type: String, required: true },              // what was bought / paid for
    paidTo:        { type: String, default: "" },                 // store, supplier or person
    receiptNo:     { type: String, default: "" },                 // OR / receipt / invoice no.
    paidFrom:      { type: String, enum: ["cash", "other"], default: "cash" }, // cash = out of the drawer
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

export default mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
