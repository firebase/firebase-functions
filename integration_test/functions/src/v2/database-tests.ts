import * as admin from "firebase-admin";
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

    try {
      await admin
        .firestore()
        .collection("databaseCreatedTests")
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

export const databaseDeletedTests = onValueDeleted(
  {
    ref: "databaseDeletedTests/{testId}/start",
    region: REGION,
  },
  async (event) => {
    const testId = event.params.testId;

    try {
      await admin
        .firestore()
        .collection("databaseDeletedTests")
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

export const databaseUpdatedTests = onValueUpdated(
  {
    ref: "databaseUpdatedTests/{testId}/start",
    region: REGION,
  },
  async (event) => {
    const testId = event.params.testId;

    try {
      await admin
        .firestore()
        .collection("databaseUpdatedTests")
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

export const databaseWrittenTests = onValueWritten(
  {
    ref: "databaseWrittenTests/{testId}/start",
    region: REGION,
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
        .collection("databaseWrittenTests")
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
