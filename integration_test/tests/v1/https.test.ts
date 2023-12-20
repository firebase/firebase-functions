import admin from "firebase-admin";
import { initializeFirebase } from "../firebaseSetup";
import { timeout } from "../utils";
import fetch from "node-fetch";

// TODO: Temporarily disable - doesn't work unless running on projects w/ permission to create public functions.
// describe("HTTP onCall trigger", () => {
//   const projectId = process.env.PROJECT_ID;
//   const testId = process.env.TEST_RUN_ID;
//   const region = process.env.REGION;
//   let loggedContext: admin.firestore.DocumentData | undefined;

//   beforeAll(async () => {
//     if (!testId || !projectId || !region) {
//       throw new Error("Environment configured incorrectly.");
//     }
//     await initializeFirebase();

//     const accessToken = await admin.credential.applicationDefault().getAccessToken();
//     const data = { foo: "bar", testId };
//     const response = await fetch(
//       `https://${region}-${projectId}.cloudfunctions.net/${testId}-v2-callableTests`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${accessToken.access_token}`,
//         },
//         body: JSON.stringify({ data }),
//       }
//     );
//     if (!response.ok) {
//       throw new Error(response.statusText);
//     }

//     await timeout(20000);

//     const logSnapshot = await admin.firestore().collection("httpsOnCallTests").doc(testId).get();
//     loggedContext = logSnapshot.data();

//     if (!loggedContext) {
//       throw new Error("loggedContext is undefined");
//     }
//   });

//   it("should have the correct data", () => {
//     expect(loggedContext?.foo).toEqual("bar");
//   });
// });

describe("HTTP onCall trigger (DISABLED)", () => {
  it("should be disabled", () => {
    expect(true).toBeTruthy();
  });
});
