import {
  onObjectDeleted,
  onObjectFinalized,
  onObjectMetadataUpdated,
} from "firebase-functions/v2/storage";
import { serializeStorageEvent } from "../serializers/storage";
import { sendEvent } from "../utils";

export const test = {
  storageOnObjectDeletedTrigger: onObjectDeleted(async (event) => {
    await sendEvent("onObjectDeleted", serializeStorageEvent(event));
  }),

  storageOnObjectFinalizedTrigger: onObjectFinalized(async (event) => {
    await sendEvent("onObjectFinalized", serializeStorageEvent(event));
  }),

  storageOnObjectMetadataUpdatedTrigger: onObjectMetadataUpdated(async (event) => {
    await sendEvent("onObjectMetadataUpdated", serializeStorageEvent(event));
  }),
};
