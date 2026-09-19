import mongoose, { Schema } from "mongoose";

const ServiceSchema = new Schema(
  {
    name:     { type: String, required: true, trim: true },
    price:    { type: Number, required: true, default: 0 },
    category: { type: String, default: "General" },
    active:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Service || mongoose.model("Service", ServiceSchema);
