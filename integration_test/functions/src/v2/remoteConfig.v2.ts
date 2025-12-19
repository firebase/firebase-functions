import { onConfigUpdated } from "firebase-functions/v2/remoteConfig";
import { sendEvent } from "../utils";
import { serializeCloudEvent } from "../serializers";

export const remoteConfigOnConfigUpdatedTests = onConfigUpdated(async (event) => {
  await sendEvent("onConfigUpdated", {
    ...serializeCloudEvent(event),
    update: event.data,
  });
});
