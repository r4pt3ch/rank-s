import mongoose, { Schema } from "mongoose";

// Suggested defaults shown in the UI; admins can add their own categories beyond these.
export const SUGGESTED_CATEGORIES = ["student", "regular", "senior"];
export const DURATIONS = ["monthly", "sixmonth", "yearly", "lifetime"];

const MembershipPlanSchema = new Schema(
  {
    category: { type: String, required: true, trim: true }, // free text - editable, not locked to a fixed list
    duration: { type: String, enum: DURATIONS, required: true },
    price: { type: Number, required: true, default: 0 }, // subscription / renewal price
    visitFee: { type: Number, required: true, default: 0 }, // fee charged each time this member checks in
  },
  { timestamps: true }
);

MembershipPlanSchema.index({ category: 1, duration: 1 }, { unique: true });

export default mongoose.models.MembershipPlan || mongoose.model("MembershipPlan", MembershipPlanSchema);
