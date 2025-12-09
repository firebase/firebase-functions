import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";
import { sendEvent } from "../utils";
import { serializeAuthBlockingEvent } from "../serializers/identity";

export const authBeforeUserCreatedTrigger = beforeUserCreated(async (event) => {
  await sendEvent("beforeUserCreated", serializeAuthBlockingEvent(event));
});

export const authBeforeUserSignedInTrigger = beforeUserSignedIn(async (event) => {
  await sendEvent("beforeUserSignedIn", serializeAuthBlockingEvent(event));
});
