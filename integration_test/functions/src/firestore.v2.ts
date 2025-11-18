import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { RUN_ID, serializeData } from "./utils";
import { PubSub } from "@google-cloud/pubsub";
import { logger } from "firebase-functions";

const pubsub = new PubSub();

async function sendEvent(event: string, data: unknown): Promise<void> {
  const topic = pubsub.topic('vitest');

  await topic.publishMessage({
    data: event
      ? Buffer.from(
          JSON.stringify({
            event,
            data,
          })
        )
      : Buffer.from(""),
  });
}

export const firestoreOnDocumentCreatedTrigger = onDocumentCreated(
  `${RUN_ID}/{documentId}`,
  async (event) => {
    logger.debug("onDocumentCreated", event);
    await sendEvent("onDocumentCreated", serializeData(event));
  }
);
