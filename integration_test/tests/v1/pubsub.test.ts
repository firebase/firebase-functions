import admin from "firebase-admin";
import { timeout } from "../utils";
import { PubSub } from "@google-cloud/pubsub";
// import fetch from "node-fetch";
import { initializeFirebase } from "../firebaseSetup";

describe("Pub/Sub onPublish trigger", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let loggedContext: admin.firestore.DocumentData | undefined;

  beforeAll(async () => {
    if (!testId || !projectId || !serviceAccountPath) {
      throw new Error("Environment configured incorrectly.");
    }

    await initializeFirebase();

    const serviceAccount = await import(serviceAccountPath);
    const topic = new PubSub({
      credentials: serviceAccount.default,
      projectId,
    }).topic("pubsubTests");

    await topic.publish(Buffer.from(JSON.stringify({ testId })));

    await timeout(20000);

    const logSnapshot = await admin
      .firestore()
      .collection("pubsubOnPublishTests")
      .doc(testId)
      .get();
    loggedContext = logSnapshot.data();
    if (!loggedContext) {
      throw new Error("loggedContext is undefined");
    }
  });

  it("should have a topic as resource", () => {
    expect(loggedContext?.resource.name).toEqual(
      `projects/${process.env.PROJECT_ID}/topics/pubsubTests`
    );
  });

  it("should not have a path", () => {
    expect(loggedContext?.path).toBeUndefined();
  });

  it("should have the correct eventType", () => {
    expect(loggedContext?.eventType).toEqual("google.pubsub.topic.publish");
  });

  it("should have an eventId", () => {
    expect(loggedContext?.eventId).toBeDefined();
  });

  it("should have timestamp", () => {
    expect(loggedContext?.timestamp).toBeDefined();
  });

  it("should not have action", () => {
    expect(loggedContext?.action).toBeUndefined();
  });

  it("should have admin auth", () => {
    expect(loggedContext?.auth).toBeUndefined();
  });

  it("should have pubsub data", () => {
    const decodedMessage = JSON.parse(loggedContext?.message);
    const decoded = new Buffer(decodedMessage.data, "base64").toString();
    const parsed = JSON.parse(decoded);
    expect(parsed.testId).toEqual(testId);
  });
});

// TODO: Uncomment this test when solution for test id access in scheduler.
// describe("Pub/Sub schedule trigger", () => {
//   const testRunId = process.env.TEST_RUN_ID;
//   let loggedContext;
//   let logSnapshot;

//   beforeAll(async () => {
//     try {
//      await initializeFirebase();
//       const accessToken = await admin.credential.applicationDefault().getAccessToken();
//       const response = await fetch(
//         `https://cloudscheduler.googleapis.com/v1/projects/${process.env.PROJECT_ID}/locations/${process.env.REGION}/jobs/firebase-schedule-${testRunId}-v1-schedule-${process.env.REGION}:run`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${accessToken.access_token}`,
//           },
//         }
//       );
//       if (!response.ok) {
//         throw new Error(`Failed request with status ${response.status}!`);
//       }

//       await timeout(15000);
//       logSnapshot = await admin.firestore().collection("pubsubScheduleTests").doc(testRunId).get();
//       loggedContext = logSnapshot.data();
//     } catch (error) {
//       console.error("Error in beforeAll:", error);
//       throw error;
//     }
//   });

//   it("should have been called", () => {
//     expect(loggedContext).toBeDefined();
//   });
// });
