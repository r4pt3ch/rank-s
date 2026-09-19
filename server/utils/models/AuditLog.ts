import mongoose, { Schema } from "mongoose";

const AuditLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, default: "system" },
    action: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
