import mongoose, { Schema } from "mongoose";

// Membership tiers:
//   walkin    → Rank F  (walk-in, no recurring subscription)
//   regular   → Rank E–A (standard members)
//   elite     → Rank S   (elite members)
export const MEMBERSHIP_TIERS = ["walkin", "regular", "elite"] as const;

export const DURATIONS = ["daily", "monthly", "quarterly", "sixmonth", "yearly"] as const;

// Which durations apply per tier
export const TIER_DURATIONS: Record<string, string[]> = {
  walkin:  [],                                                    // price set in Settings, no duration
  regular: ["daily", "monthly", "quarterly", "sixmonth", "yearly"],
  elite:   ["monthly", "quarterly", "sixmonth", "yearly"],
};

export const TIER_LABELS: Record<string, string> = {
  walkin:  "Walk-In (Rank F)",
  regular: "Regular Member (Rank E–A)",
  elite:   "Elite Member (Rank S)",
};

export const DURATION_LABELS: Record<string, string> = {
  daily:    "Daily",
  monthly:  "Monthly",
  quarterly: "Quarterly",
  sixmonth: "6 months",
  yearly:   "Yearly",
};

const MembershipPlanSchema = new Schema(
  {
    tier:      { type: String, enum: MEMBERSHIP_TIERS, required: true },
    duration:  { type: String, enum: DURATIONS, required: true },
    price:     { type: Number, required: true, default: 0 }, // subscription / renewal price
    visitFee:  { type: Number, required: true, default: 0 }, // fee each time this member checks in
  },
  { timestamps: true }
);

MembershipPlanSchema.index({ tier: 1, duration: 1 }, { unique: true });

export default mongoose.models.MembershipPlan || mongoose.model("MembershipPlan", MembershipPlanSchema);
