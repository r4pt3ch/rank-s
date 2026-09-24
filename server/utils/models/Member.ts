import mongoose, { Schema } from "mongoose";

const MemberSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    name: { type: String, required: true }, // derived: `${firstName} ${lastName}`, kept for search/display/checkin convenience
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    dob: { type: String, default: "" },
    qr: { type: String, required: true, unique: true },
    barcode: { type: String, required: true, unique: true },
    pin: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    joinDate: { type: Date, default: () => new Date() },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },

    // free text so admins can define their own membership categories, not locked to a fixed list
    membershipTier:     { type: String, enum: ["walkin", "regular", "elite", null], default: null },
    membershipCategory: { type: String, default: null },
    membershipStudentType: { type: String, enum: ["student", "non-student", null], default: null },
    membershipDuration: { type: String, enum: ["weekly", "monthly", "quarterly", "sixmonth", "annual", null], default: null },
    membershipStart:    { type: Date, default: null },
    membershipExpiry:   { type: Date, default: null },

    // Subscription pause/resume
    membershipPaused:       { type: Boolean, default: false },
    membershipPausedAt:     { type: Date, default: null },
    membershipPauseReason:  { type: String, default: null },
    membershipResumedAt:    { type: Date, default: null },
    membershipPausedDays:   { type: Number, default: 0 },
    weeklyPassExpiry:       { type: Date, default: null },
    archived:               { type: Boolean, default: false },
    archivedAt:             { type: Date, default: null },
    archivedReason:         { type: String, default: null },
    notes:                  { type: String, default: "" }, // staff notes about this member // set when a weekly pass is purchased; nil = no active pass // cumulative days paused, used to extend expiry on resume
  },
  { timestamps: true }
);

export default mongoose.models.Member || mongoose.model("Member", MemberSchema);
