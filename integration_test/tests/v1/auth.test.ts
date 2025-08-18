// import * as admin from "firebase-admin";
// import { initializeApp } from "firebase/app";
// import { createUserWithEmailAndPassword, getAuth, UserCredential } from "firebase/auth";
// import { initializeFirebase } from "../firebaseSetup";
// import { retry } from "../utils";

// describe("Firebase Auth (v1)", () => {
//   let userIds: string[] = [];
//   const projectId = process.env.PROJECT_ID;
//   const testId = process.env.TEST_RUN_ID;
//   const config = {
//     apiKey: process.env.FIREBASE_API_KEY,
//     authDomain: process.env.FIREBASE_AUTH_DOMAIN,
//     databaseURL: process.env.DATABASE_URL,
//     projectId,
//     storageBucket: process.env.STORAGE_BUCKET,
//     appId: process.env.FIREBASE_APP_ID,
//     measurementId: process.env.FIREBASE_MEASUREMENT_ID,
//   };
//   const app = initializeApp(config);

//   if (!testId || !projectId) {
//     throw new Error("Environment configured incorrectly.");
//   }

//   beforeAll(async () => {
//     await initializeFirebase();
//   });

//   afterAll(async () => {
//     for (const userId in userIds) {
//       await admin.firestore().collection("userProfiles").doc(userId).delete();
//       await admin.firestore().collection("authUserOnCreateTests").doc(userId).delete();
//       await admin.firestore().collection("authUserOnDeleteTests").doc(userId).delete();
//       await admin.firestore().collection("authBeforeCreateTests").doc(userId).delete();
//       await admin.firestore().collection("authBeforeSignInTests").doc(userId).delete();
//     }
//   });

//   describe("user onCreate trigger", () => {
//     let userRecord: admin.auth.UserRecord;
//     let loggedContext: admin.firestore.DocumentData | undefined;

//     beforeAll(async () => {
//       userRecord = await admin.auth().createUser({
//         email: `${testId}@fake-create.com`,
//         password: "secret",
//         displayName: `${testId}`,
//       });

//       loggedContext = await retry(() =>
//         admin
//           .firestore()
//           .collection("authUserOnCreateTests")
//           .doc(userRecord.uid)
//           .get()
//           .then((logSnapshot) => logSnapshot.data())
//       );

//       userIds.push(userRecord.uid);
//     });

//     afterAll(async () => {
//       await admin.auth().deleteUser(userRecord.uid);
//     });

//     it("should perform expected actions", async () => {
//       const userProfile = await admin
//         .firestore()
//         .collection("userProfiles")
//         .doc(userRecord.uid)
//         .get();
//       expect(userProfile.exists).toBeTruthy();
//     });

//     it("should have a project as resource", () => {
//       expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
//     });

//     it("should not have a path", () => {
//       expect(loggedContext?.path).toBeUndefined();
//     });

//     it("should have the correct eventType", () => {
//       expect(loggedContext?.eventType).toEqual("google.firebase.auth.user.create");
//     });

//     it("should have an eventId", () => {
//       expect(loggedContext?.eventId).toBeDefined();
//     });

//     it("should have a timestamp", () => {
//       expect(loggedContext?.timestamp).toBeDefined();
//     });

//     it("should not have auth", () => {
//       expect(loggedContext?.auth).toBeUndefined();
//     });

//     it("should not have an action", () => {
//       expect(loggedContext?.action).toBeUndefined();
//     });

//     it("should have properly defined metadata", () => {
//       const parsedMetadata = JSON.parse(loggedContext?.metadata);
//       // TODO: better handle date format mismatch and precision
//       const expectedCreationTime = new Date(userRecord.metadata.creationTime)
//         .toISOString()
//         .replace(/\.\d{3}/, "");
//       const expectedMetadata = {
//         ...userRecord.metadata,
//         creationTime: expectedCreationTime,
//       };

//       expect(expectedMetadata).toEqual(expect.objectContaining(parsedMetadata));
//     });
//   });

//   describe("user onDelete trigger", () => {
//     let userRecord: admin.auth.UserRecord;
//     let loggedContext: admin.firestore.DocumentData | undefined;

//     beforeAll(async () => {
//       userRecord = await admin.auth().createUser({
//         email: `${testId}@fake-delete.com`,
//         password: "secret",
//         displayName: `${testId}`,
//       });

//       await admin.auth().deleteUser(userRecord.uid);

//       loggedContext = await retry(
//         () =>
//           admin
//             .firestore()
//             .collection("authUserOnDeleteTests")
//             .doc(userRecord.uid)
//             .get()
//             .then((logSnapshot) => logSnapshot.data()),
//       );

//       userIds.push(userRecord.uid);
//     });

//     it("should have a project as resource", () => {
//       expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
//     });

//     it("should not have a path", () => {
//       expect(loggedContext?.path).toBeUndefined();
//     });

//     it("should have the correct eventType", async () => {
//       expect(loggedContext?.eventType).toEqual("google.firebase.auth.user.delete");
//     });

//     it("should have an eventId", () => {
//       expect(loggedContext?.eventId).toBeDefined();
//     });

//     it("should have a timestamp", () => {
//       expect(loggedContext?.timestamp).toBeDefined();
//     });

//     it("should not have auth", () => {
//       expect(loggedContext?.auth).toBeUndefined();
//     });

//     it("should not have an action", () => {
//       expect(loggedContext?.action).toBeUndefined();
//     });
//   });

//   describe("user beforeCreate trigger", () => {
//     let userRecord: UserCredential;
//     let loggedContext: admin.firestore.DocumentData | undefined;

//     beforeAll(async () => {
//       userRecord = await createUserWithEmailAndPassword(
//         getAuth(app),
//         `${testId}@fake-before-create.com`,
//         "secret"
//       );

//       loggedContext = await retry(() =>
//         admin
//           .firestore()
//           .collection("authBeforeCreateTests")
//           .doc(userRecord.user.uid)
//           .get()
//           .then((logSnapshot) => logSnapshot.data())
//       );

//       userIds.push(userRecord.user.uid);
//     });

//     afterAll(async () => {
//       await admin.auth().deleteUser(userRecord.user.uid);
//     });

//     it("should have a project as resource", () => {
//       expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
//     });

//     it("should have the correct eventType", () => {
//       expect(loggedContext?.eventType).toEqual(
//         "providers/cloud.auth/eventTypes/user.beforeCreate:password"
//       );
//     });

//     it("should have an eventId", () => {
//       expect(loggedContext?.eventId).toBeDefined();
//     });

//     it("should have a timestamp", () => {
//       expect(loggedContext?.timestamp).toBeDefined();
//     });
//   });

//   describe("user beforeSignIn trigger", () => {
//     let userRecord: UserCredential;
//     let loggedContext: admin.firestore.DocumentData | undefined;

//     beforeAll(async () => {
//       userRecord = await createUserWithEmailAndPassword(
//         getAuth(app),
//         `${testId}@fake-before-signin.com`,
//         "secret"
//       );

//       loggedContext = await retry(() =>
//         admin
//           .firestore()
//           .collection("authBeforeSignInTests")
//           .doc(userRecord.user.uid)
//           .get()
//           .then((logSnapshot) => logSnapshot.data())
//       );

//       userIds.push(userRecord.user.uid);

//       if (!loggedContext) {
//         throw new Error("loggedContext is undefined");
//       }
//     });

//     afterAll(async () => {
//       await admin.auth().deleteUser(userRecord.user.uid);
//     });

//     it("should have a project as resource", () => {
//       expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
//     });

//     it("should have the correct eventType", () => {
//       expect(loggedContext?.eventType).toEqual(
//         "providers/cloud.auth/eventTypes/user.beforeSignIn:password"
//       );
//     });

//     it("should have an eventId", () => {
//       expect(loggedContext?.eventId).toBeDefined();
//     });

//     it("should have a timestamp", () => {
//       expect(loggedContext?.timestamp).toBeDefined();
//     });
//   });
// });
