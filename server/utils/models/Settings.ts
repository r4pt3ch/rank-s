import mongoose, { Schema } from "mongoose";

const SettingsSchema = new Schema({
  key: { type: String, default: "default", unique: true },
  pointsPerCheckIn: { type: Number, default: 20 },
  walkInFee: { type: Number, default: 50 },
});

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
