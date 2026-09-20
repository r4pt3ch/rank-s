import mongoose, { Schema } from "mongoose";

export const MEMBERSHIP_TIERS = ["walkin", "regular", "elite"] as const;
export const STUDENT_TYPES = ["student", "non-student"] as const;

// Regular: subscription durations with daily/weekly check-in fees
// Elite: subscription durations only, no check-in fee
export const REGULAR_DURATIONS = ["monthly", "annual"] as const;
export const ELITE_DURATIONS   = ["monthly", "quarterly", "sixmonth", "annual"] as const;
export const DURATIONS = ["monthly", "quarterly", "sixmonth", "annual"] as const;

export const TIER_DURATIONS: Record<string, string[]> = {
  walkin:  [],
  regular: ["monthly", "annual"],
  elite:   ["monthly", "quarterly", "sixmonth", "annual"],
};

export const TIER_LABELS: Record<string, string> = {
  walkin:  "Walk-In (Rank F)",
  regular: "Regular Member (Rank E–A)",
  elite:   "Elite Member (Rank S)",
};

export const DURATION_LABELS: Record<string, string> = {
  monthly:   "Monthly",
  quarterly: "3 Months",
  sixmonth:  "6 Months",
  annual:    "Annual",
};

const MembershipPlanSchema = new Schema(
  {
    tier:        { type: String, enum: MEMBERSHIP_TIERS, required: true },
    studentType: { type: String, enum: STUDENT_TYPES, required: true, default: "non-student" },
    duration:    { type: String, enum: DURATIONS, required: true },
    price:       { type: Number, required: true, default: 0 },
    dailyFee:    { type: Number, default: 0 }, // Regular only
    weeklyFee:   { type: Number, default: 0 }, // Regular only
  },
  { timestamps: true }
);

MembershipPlanSchema.index({ tier: 1, studentType: 1, duration: 1 }, { unique: true });

export default mongoose.models.MembershipPlan || mongoose.model("MembershipPlan", MembershipPlanSchema);
