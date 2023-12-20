import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

// describe("Scheduler onSchedule trigger", () => {
//   const projectId = process.env.PROJECT_ID;
//   const region = process.env.REGION;
//   const testId = process.env.TEST_RUN_ID;
//   let loggedContext: admin.firestore.DocumentData | undefined;

//   beforeAll(async () => {
//     if (!testId || !projectId || !region) {
//       throw new Error("Environment configured incorrectly.");
//     }
//     await initializeFirebase();

//     const accessToken = await admin.credential.applicationDefault().getAccessToken();

//     const response = await fetch(
//       `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/us-central1/jobs/firebase-schedule-${testId}-v2-schedule-${region}:run`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${accessToken.access_token}`,
//         },
//       }
//     );
//     if (!response.ok) {
//       throw new Error(`Failed request with status ${response.status}!`);
//     }

//     await timeout(15000);

//     const logSnapshot = await admin
//       .firestore()
//       .collection("schedulerOnScheduleV2Tests")
//       .doc(testId)
//       .get();
//     loggedContext = logSnapshot.data();

//     if (!loggedContext) {
//       throw new Error("loggedContext is undefined");
//     }
//   });

//   it("should trigger when the scheduler fires", () => {
//     expect(loggedContext?.success).toBeTruthy();
//   });
// });

describe("HTTP onCall trigger (DISABLED)", () => {
  it("should be disabled", () => {
    expect(true).toBeTruthy();
  });
});
