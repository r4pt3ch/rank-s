import mongoose, { Schema } from "mongoose";

const ReceiptSettingsSchema = new Schema({
  key: { type: String, default: "default", unique: true },
  gymName: { type: String, default: "Rank S Fitness Gym" },
  address: { type: String, default: "" },
  phone: { type: String, default: "" },
  footerMessage: { type: String, default: "Thank you for training with us!" },
  showLogo: { type: Boolean, default: true },
  showAddress: { type: Boolean, default: true },
  showPhone: { type: Boolean, default: true },
  showReceiptNumber: { type: Boolean, default: true },
  showDateTime: { type: Boolean, default: true },
  showCashier: { type: Boolean, default: true },
  showItemizedList: { type: Boolean, default: true },
  showFooterMessage: { type: Boolean, default: true },
});

export default mongoose.models.ReceiptSettings || mongoose.model("ReceiptSettings", ReceiptSettingsSchema);
