import { connectDB } from "../../utils/db";
import { performCheckIn } from "../../utils/checkin";

export default defineEventHandler(async (event) => {
  await connectDB();
  const body = await readBody(event);

  if (body.mode === "member") {
    if (!body.pin) {
      throw createError({ statusCode: 400, statusMessage: "Enter your PIN to check in." });
    }
    return performCheckIn({ pin: body.pin, issuedBy: null, source: "kiosk" });
  }

  if (body.mode === "walkin") {
    if (!body.name) {
      throw createError({ statusCode: 400, statusMessage: "Enter your name to check in." });
    }
    return performCheckIn({ walkinName: body.name, issuedBy: null, source: "kiosk" });
  }

  throw createError({ statusCode: 400, statusMessage: "Specify mode as 'member' or 'walkin'." });
});
