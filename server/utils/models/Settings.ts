import mongoose, { Schema } from "mongoose";

const SettingsSchema = new Schema({
  key: { type: String, default: "default", unique: true },
  pointsPerCheckIn: { type: Number, default: 20 },
  walkInFee: { type: Number, default: 50 },

  // Lobby display controls
  lobbyAutoClearEnabled: { type: Boolean, default: false },
  lobbyDisplayMinutes: { type: Number, default: 60 }, // how long a check-in stays visible on the board
  lobbyResetAt: { type: Date, default: null }, // set when staff manually clear the board
});

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
