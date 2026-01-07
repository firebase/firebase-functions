import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";
import { serializeAuthBlockingEvent } from "../serializers/identity";
import { sendEvent } from "../utils";

export const authBeforeUserCreatedTrigger = beforeUserCreated(async (event) => {
  await sendEvent("beforeUserCreated", serializeAuthBlockingEvent(event));
});

export const authBeforeUserSignedInTrigger = beforeUserSignedIn(async (event) => {
  await sendEvent("beforeUserSignedIn", serializeAuthBlockingEvent(event));
});

export const test = {
  authBeforeUserCreatedTrigger,
  authBeforeUserSignedInTrigger,
};
