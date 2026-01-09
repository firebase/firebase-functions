import * as functions from "firebase-functions/v1";
import { sendEvent } from "../utils";

export const remoteConfigV1OnConfigUpdatedTests = functions.remoteConfig.onUpdate(
  async (update, event) => {
    await sendEvent("onConfigUpdatedV1", {
      ...event,
      update,
    });
  }
);

export const test = {
  remoteConfigV1OnConfigUpdatedTests,
};
