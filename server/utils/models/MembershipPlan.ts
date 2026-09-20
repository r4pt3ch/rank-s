import mongoose, { Schema } from "mongoose";

export const MEMBERSHIP_TIERS = ["walkin", "regular", "elite"] as const;
export const DURATIONS = ["daily", "weekly", "monthly", "annual"] as const;
export const STUDENT_TYPES = ["student", "non-student"] as const;

export const TIER_DURATIONS: Record<string, string[]> = {
  walkin:  [],
  regular: ["daily", "weekly", "monthly", "annual"],
  elite:   ["monthly", "annual"],
};

export const TIER_LABELS: Record<string, string> = {
  walkin:  "Walk-In (Rank F)",
  regular: "Regular Member (Rank E–A)",
  elite:   "Elite Member (Rank S)",
};

export const DURATION_LABELS: Record<string, string> = {
  daily:   "Daily",
  weekly:  "Weekly",
  monthly: "Monthly",
  annual:  "Annual",
};

const MembershipPlanSchema = new Schema(
  {
    tier:        { type: String, enum: MEMBERSHIP_TIERS, required: true },
    studentType: { type: String, enum: STUDENT_TYPES, required: true, default: "non-student" },
    duration:    { type: String, enum: DURATIONS, required: true },
    price:       { type: Number, required: true, default: 0 },
    visitFee:    { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

MembershipPlanSchema.index({ tier: 1, studentType: 1, duration: 1 }, { unique: true });

export default mongoose.models.MembershipPlan || mongoose.model("MembershipPlan", MembershipPlanSchema);
