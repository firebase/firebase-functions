import {
  onDocumentCreated,
  onDocumentCreatedWithAuthContext,
  onDocumentDeleted,
  onDocumentDeletedWithAuthContext,
  onDocumentUpdated,
  onDocumentUpdatedWithAuthContext,
} from "firebase-functions/v2/firestore";
import {
  serializeChangeEvent,
  serializeFirestoreAuthEvent,
  serializeFirestoreEvent,
  serializeQueryDocumentSnapshot,
} from "../serializers/firestore";
import { sendEvent } from "../utils";

export const test = {
  firestoreOnDocumentCreatedTrigger: onDocumentCreated(
    `integration_test/{runId}/onDocumentCreated/{documentId}`,
    async (event) => {
      await sendEvent(
        "onDocumentCreated",
        serializeFirestoreEvent(event, serializeQueryDocumentSnapshot(event.data!))
      );
    }
  ),

  firestoreOnDocumentUpdatedTrigger: onDocumentUpdated(
    `integration_test/{runId}/onDocumentUpdated/{documentId}`,
    async (event) => {
      await sendEvent(
        "onDocumentUpdated",
        serializeFirestoreEvent(event, serializeChangeEvent(event.data!))
      );
    }
  ),

  firestoreOnDocumentDeletedTrigger: onDocumentDeleted(
    `integration_test/{runId}/onDocumentDeleted/{documentId}`,
    async (event) => {
      await sendEvent(
        "onDocumentDeleted",
        serializeFirestoreEvent(event, serializeQueryDocumentSnapshot(event.data!))
      );
    }
  ),

  // TODO: Tests need to handle multiple changes to the same document
  // firestoreOnDocumentWrittenTrigger: onDocumentWritten(
  //   `integration_test/{runId}/onDocumentWritten/{documentId}`,
  //   async (event) => {
  //     await sendEvent(
  //       "onDocumentWritten",
  //       serializeFirestoreEvent(event, serializeQueryDocumentSnapshot(event.data!))
  //     );
  //   }
  // ),

  firestoreOnDocumentCreatedWithAuthContextTrigger: onDocumentCreatedWithAuthContext(
    `integration_test/{runId}/onDocumentCreatedWithAuthContext/{documentId}`,
    async (event) => {
      await sendEvent(
        "onDocumentCreatedWithAuthContext",
        serializeFirestoreAuthEvent(event, serializeQueryDocumentSnapshot(event.data!))
      );
    }
  ),

  firestoreOnDocumentUpdatedWithAuthContextTrigger: onDocumentUpdatedWithAuthContext(
    `integration_test/{runId}/onDocumentUpdatedWithAuthContext/{documentId}`,
    async (event) => {
      await sendEvent(
        "onDocumentUpdatedWithAuthContext",
        serializeFirestoreAuthEvent(event, serializeChangeEvent(event.data!))
      );
    }
  ),

  firestoreOnDocumentDeletedWithAuthContextTrigger: onDocumentDeletedWithAuthContext(
    `integration_test/{runId}/onDocumentDeletedWithAuthContext/{documentId}`,
    async (event) => {
      await sendEvent(
        "onDocumentDeletedWithAuthContext",
        serializeFirestoreAuthEvent(event, serializeQueryDocumentSnapshot(event.data!))
      );
    }
  ),
};
