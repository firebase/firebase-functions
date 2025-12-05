import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { RUN_ID } from "./utils";
import { firestore } from "./utils";
import { serializeFirestoreEvent, serializeQueryDocumentSnapshot } from "./serializers";

async function sendEvent(event: string, data: any): Promise<void> {
  await firestore.collection(RUN_ID).doc(event).set(data);
}

export const firestoreOnDocumentCreatedTrigger = onDocumentCreated(
  `integration_test/{runId}/onDocumentCreated/{documentId}`,
  async (event) => {
    await sendEvent(
      "onDocumentCreated",
      serializeFirestoreEvent(event, serializeQueryDocumentSnapshot(event.data!))
    );
  }
);
