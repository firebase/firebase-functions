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

export const firestoreOnDocumentCreatedTrigger = onDocumentCreated(
  `integration_test/{runId}/onDocumentCreated/{documentId}`,
  async (event) => {
    await sendEvent(
      "onDocumentCreated",
      serializeFirestoreEvent(event, serializeQueryDocumentSnapshot(event.data!))
    );
  }
);

export const firestoreOnDocumentUpdatedTrigger = onDocumentUpdated(
  `integration_test/{runId}/onDocumentUpdated/{documentId}`,
  async (event) => {
    await sendEvent(
      "onDocumentUpdated",
      serializeFirestoreEvent(event, serializeChangeEvent(event.data!))
    );
  }
);

export const firestoreOnDocumentDeletedTrigger = onDocumentDeleted(
  `integration_test/{runId}/onDocumentDeleted/{documentId}`,
  async (event) => {
    await sendEvent(
      "onDocumentDeleted",
      serializeFirestoreEvent(event, serializeQueryDocumentSnapshot(event.data!))
    );
  }
);

// TODO: Tests need to handle multiple changes to the same document
// export const firestoreOnDocumentWrittenTrigger = onDocumentWritten(
//   `integration_test/{runId}/onDocumentWritten/{documentId}`,
//   async (event) => {
//     await sendEvent(
//       "onDocumentWritten",
//       serializeFirestoreEvent(event, serializeQueryDocumentSnapshot(event.data!))
//     );
//   }
// );

export const firestoreOnDocumentCreatedWithAuthContextTrigger = onDocumentCreatedWithAuthContext(
  `integration_test/{runId}/onDocumentCreatedWithAuthContext/{documentId}`,
  async (event) => {
    await sendEvent(
      "onDocumentCreatedWithAuthContext",
      serializeFirestoreAuthEvent(event, serializeQueryDocumentSnapshot(event.data!))
    );
  }
);

export const firestoreOnDocumentUpdatedWithAuthContextTrigger = onDocumentUpdatedWithAuthContext(
  `integration_test/{runId}/onDocumentUpdatedWithAuthContext/{documentId}`,
  async (event) => {
    await sendEvent(
      "onDocumentUpdatedWithAuthContext",
      serializeFirestoreAuthEvent(event, serializeChangeEvent(event.data!))
    );
  }
);

export const firestoreOnDocumentDeletedWithAuthContextTrigger = onDocumentDeletedWithAuthContext(
  `integration_test/{runId}/onDocumentDeletedWithAuthContext/{documentId}`,
  async (event) => {
    await sendEvent(
      "onDocumentDeletedWithAuthContext",
      serializeFirestoreAuthEvent(event, serializeQueryDocumentSnapshot(event.data!))
    );
  }
);

export const test = {
  firestoreOnDocumentCreatedTrigger,
  firestoreOnDocumentUpdatedTrigger,
  firestoreOnDocumentDeletedTrigger,
  firestoreOnDocumentCreatedWithAuthContextTrigger,
  firestoreOnDocumentUpdatedWithAuthContextTrigger,
  firestoreOnDocumentDeletedWithAuthContextTrigger,
};
