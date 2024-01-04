import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const pubsubOnPublishTests: any = functions
  .region(REGION)
  .pubsub.topic("pubsubTests")
  .onPublish(async (message, context) => {
    let testId = message.json?.testId;
    if (!testId) {
      console.error("TestId not found for onPublish function execution");
      return;
    }
    try {
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
    } catch (error) {
      console.error(`Error in Pub/Sub onPublish function for testId: ${testId}`, error);
    }
  });

export const pubsubScheduleTests: any = functions
  .region(REGION)
  .pubsub.schedule("every 10 hours") // This is a dummy schedule, since we need to put a valid one in.
  // For the test, the job is triggered by the jobs:run api
  .onRun(async (context) => {
    const testId = context.resource?.labels?.service_name?.split("-")[0];
    if (!testId) {
      console.error("TestId not found for scheduled function execution");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("pubsubScheduleTests")
        .doc(testId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(`Error in Pub/Sub schedule function for testId: ${testId}`, error);
    }
  });
