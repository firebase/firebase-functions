import * as functions from "firebase-functions/v1";
import { sendEvent } from "../utils";
import { serializeEventContext } from "../serializers";

export const storageV1OnObjectDeletedTrigger = functions.storage.object().onDelete(async (object, ctx) => {
  await sendEvent("onObjectDeletedV1", {
    ...serializeEventContext(ctx),
    object,
  });
});

export const storageV1OnObjectFinalizedTrigger = functions.storage.object().onFinalize(async (object, ctx) => {
  await sendEvent("onObjectFinalizedV1", {
    ...serializeEventContext(ctx),
    object,
  });
});

export const storageV1OnObjectMetadataUpdatedTrigger = functions.storage.object().onMetadataUpdate(async (object, ctx) => {
  await sendEvent("onObjectMetadataUpdatedV1", {
    ...serializeEventContext(ctx),
    object,
  });
});
