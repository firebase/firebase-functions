import * as functions from "firebase-functions/v1";
import { serializeChangeEvent, serializeDataSnapshot } from "../serializers/database";
import { sendEvent } from "../utils";

export const databaseV1OnValueCreated = functions.database
  .ref(`integration_test/{runId}/onValueCreatedV1/{timestamp}`)
  .onCreate(async (snapshot) => {
    await sendEvent("onValueCreatedV1", serializeDataSnapshot(snapshot));
  });

export const databaseV1OnValueUpdated = functions.database
  .ref(`integration_test/{runId}/onValueUpdatedV1/{timestamp}`)
  .onUpdate(async (change) => {
    await sendEvent("onValueUpdatedV1", serializeChangeEvent(change));
  });

export const databaseV1OnValueDeleted = functions.database
  .ref(`integration_test/{runId}/onValueDeletedV1/{timestamp}`)
  .onDelete(async (snapshot) => {
    await sendEvent("onValueDeletedV1", serializeDataSnapshot(snapshot));
  });

export const test = {
  databaseV1OnValueCreated,
  databaseV1OnValueUpdated,
  databaseV1OnValueDeleted,
};
