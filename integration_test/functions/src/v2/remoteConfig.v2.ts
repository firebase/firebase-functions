import { onConfigUpdated } from "firebase-functions/v2/remoteConfig";
import { sendEvent } from "../utils";
import { serializeCloudEvent } from "../serializers";

export const remoteConfigOnConfigUpdatedTests = onConfigUpdated(async (event) => {
  await sendEvent("onConfigUpdated", {
    ...serializeCloudEvent(event),
    update: {
      versionNumber: event.data.versionNumber,
      updateTime: event.data.updateTime,
      updateUser: event.data.updateUser,
      description: event.data.description,
      updateOrigin: event.data.updateOrigin,
      updateType: event.data.updateType,
      rollbackSource: event.data.rollbackSource,
    },
  });
});
