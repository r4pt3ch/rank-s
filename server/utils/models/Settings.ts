import mongoose, { Schema } from "mongoose";

const SettingsSchema = new Schema({
  key: { type: String, default: "default", unique: true },
  pointsPerCheckIn: { type: Number, default: 20 },

  // Separate walk-in fees for student and non-student
  walkInFeeStudent:    { type: Number, default: 40 },
  walkInFeeNonStudent: { type: Number, default: 60 },

  // Lobby display controls
  lobbyAutoClearEnabled: { type: Boolean, default: false },
  lobbyDisplayMinutes:   { type: Number, default: 60 },
  lobbyResetAt:          { type: Date, default: null },

  // Timezone (UTC offset hours, e.g. 8 for Asia/Manila UTC+8)
  utcOffset: { type: Number, default: 8 },
});

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
