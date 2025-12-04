import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { RUN_ID, serializeData } from "./utils";
import { logger } from "firebase-functions";
import { firestore } from "./utils";

async function sendEvent(event: string, data: any): Promise<void> {
  await firestore.collection(`${RUN_ID}_snapshots`).doc(event).set(serializeData(data));
}

export const firestoreOnDocumentCreatedTrigger = onDocumentCreated(
  `${RUN_ID}/{documentId}`,
  async (event) => {
    logger.debug("onDocumentCreated", event);
    await sendEvent("onDocumentCreated", event);
  }
);


export const foo = onDocumentCreated(
  `test/{documentId}`,
  async (event) => {
    logger.debug("onDocumentCreated", event);
    await sendEvent("onDocumentCreated", event);
  }
);