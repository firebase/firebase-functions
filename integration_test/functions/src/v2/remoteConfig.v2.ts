import { onConfigUpdated } from "firebase-functions/v2/remoteConfig";
import { serializeCloudEvent } from "../serializers";
import { sendEvent } from "../utils";

export const test = {
  remoteConfigOnConfigUpdatedTests: onConfigUpdated(async (event) => {
    await sendEvent("onConfigUpdated", {
      ...serializeCloudEvent(event),
      update: event.data,
    });
  }),
};
