import * as functions from "firebase-functions/v1";
import { sendEvent } from "../utils";
import { serializeChangeEvent, serializeQueryDocumentSnapshot } from "../serializers/firestore";

export const firestoreV1OnDocumentCreatedTrigger = functions.firestore
  .document(`integration_test/{runId}/oDocumentCreatedV1/{documentId}`)
  .onCreate(async (snapshot) => {
    await sendEvent("onDocumentCreatedV1", serializeQueryDocumentSnapshot(snapshot));
  });

export const firestoreV1OnDocumentUpdatedTrigger = functions.firestore
  .document(`integration_test/{runId}/oDocumentUpdatedV1/{documentId}`)
  .onUpdate(async (change) => {
    await sendEvent("onDocumentUpdatedV1", serializeChangeEvent(change));
  });

export const firestoreV1OnDocumentDeletedTrigger = functions.firestore
  .document(`integration_test/{runId}/oDocumentDeletedV1/{documentId}`)
  .onDelete(async (snapshot) => {
    await sendEvent("onDocumentDeletedV1", serializeQueryDocumentSnapshot(snapshot));
  });

// TODO: onWrite - need multiple event handler
