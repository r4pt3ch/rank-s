import mongoose, { Schema } from "mongoose";

const LoginLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    username: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.LoginLog || mongoose.model("LoginLog", LoginLogSchema);
