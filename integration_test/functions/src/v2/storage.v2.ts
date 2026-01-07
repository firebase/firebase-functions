import {
  onObjectDeleted,
  onObjectFinalized,
  onObjectMetadataUpdated,
} from "firebase-functions/v2/storage";
import { serializeStorageEvent } from "../serializers/storage";
import { sendEvent } from "../utils";

export const storageOnObjectDeletedTrigger = onObjectDeleted(async (event) => {
  await sendEvent("onObjectDeleted", serializeStorageEvent(event));
});

export const storageOnObjectFinalizedTrigger = onObjectFinalized(async (event) => {
  await sendEvent("onObjectFinalized", serializeStorageEvent(event));
});

export const storageOnObjectMetadataUpdatedTrigger = onObjectMetadataUpdated(async (event) => {
  await sendEvent("onObjectMetadataUpdated", serializeStorageEvent(event));
});

export const test = {
  storageOnObjectDeletedTrigger,
  storageOnObjectFinalizedTrigger,
  storageOnObjectMetadataUpdatedTrigger,
};
