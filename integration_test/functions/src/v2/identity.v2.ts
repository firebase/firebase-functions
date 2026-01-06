import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";
import { serializeAuthBlockingEvent } from "../serializers/identity";
import { sendEvent } from "../utils";

export const test = {
  authBeforeUserCreatedTrigger: beforeUserCreated(async (event) => {
    await sendEvent("beforeUserCreated", serializeAuthBlockingEvent(event));
  }),

  authBeforeUserSignedInTrigger: beforeUserSignedIn(async (event) => {
    await sendEvent("beforeUserSignedIn", serializeAuthBlockingEvent(event));
  }),
};
