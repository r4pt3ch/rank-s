import mongoose, { Schema } from "mongoose";

export const RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS"];

const ThresholdSchema = new Schema({
  key: { type: String, default: "default", unique: true },
  values: {
    type: Map,
    of: Number,
    default: () => ({
      F: 0,
      E: 50,
      D: 120,
      C: 220,
      B: 350,
      A: 520,
      S: 750,
      SS: 1050,
      SSS: 1500,
    }),
  },
});

export default mongoose.models.Threshold || mongoose.model("Threshold", ThresholdSchema);
