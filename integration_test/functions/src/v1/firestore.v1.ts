import * as functions from "firebase-functions/v1";
import { serializeChangeEvent, serializeQueryDocumentSnapshot } from "../serializers/firestore";
import { sendEvent } from "../utils";

export const test = {
  firestoreV1OnDocumentCreatedTrigger: functions.firestore
    .document(`integration_test/{runId}/oDocumentCreatedV1/{documentId}`)
    .onCreate(async (snapshot) => {
      await sendEvent("onDocumentCreatedV1", serializeQueryDocumentSnapshot(snapshot));
    }),

  firestoreV1OnDocumentUpdatedTrigger: functions.firestore
    .document(`integration_test/{runId}/oDocumentUpdatedV1/{documentId}`)
    .onUpdate(async (change) => {
      await sendEvent("onDocumentUpdatedV1", serializeChangeEvent(change));
    }),

  firestoreV1OnDocumentDeletedTrigger: functions.firestore
    .document(`integration_test/{runId}/oDocumentDeletedV1/{documentId}`)
    .onDelete(async (snapshot) => {
      await sendEvent("onDocumentDeletedV1", serializeQueryDocumentSnapshot(snapshot));
    }),

  // TODO: onWrite - need multiple event handler
};
