import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {
  onValueWritten,
  onValueCreated,
  onValueUpdated,
  onValueDeleted,
} from "firebase-functions/v2/database";
import { sanitizeData } from "../utils";
import { REGION } from "../region";

export const databaseCreatedTests = onValueCreated(
  {
    ref: "databaseCreatedTests/{testId}/start",
    region: REGION,
  },
  async (event) => {
    const testId = event.params.testId;
    await admin
      .firestore()
      .collection("databaseCreatedTests")
      .doc(testId)
      .set(
        sanitizeData({
          testId,
          type: event.type,
          id: event.id,
          time: event.time,
          url: event.ref.toString(),
        })
      );
  }
);

// export const databaseDeletedTests = onValueDeleted(
//   {
//     ref: "databaseDeletedTests/{testId}/start",
//     region: REGION,
//   },
//   async (event) => {
//     const testId = event.params.testId;
//     await admin
//       .firestore()
//       .collection("databaseDeletedTests")
//       .doc(testId)
//       .set(
//         sanitizeData({
//           testId,
//           type: event.type,
//           id: event.id,
//           time: event.time,
//           url: event.ref.toString(),
//         })
//       );
//   }
// );

// export const databaseUpdatedTests = onValueUpdated(
//   {
//     ref: "databaseUpdatedTests/{testId}/start",
//     region: REGION,
//   },
//   async (event) => {
//     const testId = event.params.testId;
//     const data = event.data.after.val();
//     await admin
//       .firestore()
//       .collection("databaseUpdatedTests")
//       .doc(testId)
//       .set(
//         sanitizeData({
//           testId,
//           url: event.ref.toString(),
//           type: event.type,
//           id: event.id,
//           time: event.time,
//           data: JSON.stringify(data ?? {}),
//         })
//       );
//   }
// );

// export const databaseWrittenTests = onValueWritten(
//   {
//     ref: "databaseWrittenTests/{testId}/start",
//     region: REGION,
//   },
//   async (event) => {
//     const testId = event.params.testId;
//     if (!event.data.after.exists()) {
//       functions.logger.info(`Event for ${testId} is null; presuming data cleanup, so skipping.`);
//       return;
//     }
//     await admin
//       .firestore()
//       .collection("databaseWrittenTests")
//       .doc(testId)
//       .set(
//         sanitizeData({
//           testId,
//           type: event.type,
//           id: event.id,
//           time: event.time,
//           url: event.ref.toString(),
//         })
//       );
//   }
// );
