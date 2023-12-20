import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2";
import { sanitizeData } from "../utils";

export const dbOnWrittenTests = functions.database.onValueWritten(
  {
    ref: "dbWrittenTests/{testId}/start",
  },
  async (event) => {
    const testId = event.params.testId;

    if (!event.data.after.exists()) {
      console.info(`Event for ${testId} is null; presuming data cleanup, so skipping.`);
      return;
    }

    try {
      await admin
        .firestore()
        .collection("databaseOnWrittenTests")
        .doc(testId)
        .set(
          sanitizeData({
            testId,
            url: event.ref.toString(),
          })
        );
    } catch (error) {
      console.error(`Error creating test record for testId: ${testId}`, error);
    }
  }
);

export const databaseCreatedTests = functions.database.onValueCreated(
  {
    ref: "dbCreatedTests/{testId}/start",
  },
  async (event) => {
    const testId = event.params.testId;

    try {
      await admin
        .firestore()
        .collection("databaseOnCreatedTests")
        .doc(testId)
        .set(
          sanitizeData({
            testId,
            url: event.ref.toString(),
          })
        );
    } catch (error) {
      console.error(`Error creating test record for testId: ${testId}`, error);
    }
  }
);

export const databaseUpdatedTests = functions.database.onValueUpdated(
  "dbUpdatedTests/{testId}/start",
  async (event) => {
    const testId = event.params.testId;

    try {
      await admin
        .firestore()
        .collection("databaseOnUpdatedTests")
        .doc(testId)
        .set(
          sanitizeData({
            testId,
            url: event.ref.toString(),
          })
        );
    } catch (error) {
      console.error(`Error creating test record for testId: ${testId}`, error);
    }
  }
);

export const databaseDeletedTests = functions.database.onValueDeleted(
  {
    ref: "dbDeletedTests/{testId}/start",
  },
  async (event) => {
    const testId = event.params.testId;

    try {
      await admin
        .firestore()
        .collection("databaseOnDeletedTests")
        .doc(testId)
        .set(
          sanitizeData({
            testId,
            url: event.ref.toString(),
          })
        );
    } catch (error) {
      console.error(`Error creating test record for testId: ${testId}`, error);
    }
  }
);
