import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const pubsubOnPublishTests = functions
  .region(REGION)
  .pubsub.topic("pubsubTests")
  .onPublish(async (message, context) => {
    const testId = (message.json as { testId?: string })?.testId;
    await admin
      .firestore()
      .collection("pubsubOnPublishTests")
      .doc(testId)
      .set(
        sanitizeData({
          ...context,
          message: JSON.stringify(message),
        })
      );
  });

export const pubsubScheduleTests = functions
  .region(REGION)
  .pubsub.schedule("every 10 hours") // This is a dummy schedule, since we need to put a valid one in.
  // For the test, the job is triggered by the jobs:run api
  .onRun(async (context) => {
    const topicName = /\/topics\/([a-zA-Z0-9\-\_]+)/gi.exec(context.resource.name)[1];

    if (!topicName) {
      functions.logger.error(
        "Topic name not found in resource name for scheduled function execution"
      );
      return;
    }
    await admin
      .firestore()
      .collection("pubsubScheduleTests")
      .doc(topicName)
      .set(sanitizeData(context));
  });
