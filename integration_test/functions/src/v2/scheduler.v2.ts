import { onSchedule } from "firebase-functions/v2/scheduler";
import { sendEvent } from "../utils";

export const schedulerOnScheduleTrigger = onSchedule("every day 00:00", async (event) => {
  await sendEvent("onSchedule", event);
});
