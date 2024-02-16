import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const databaseRefOnCreateTests: any = functions
  .region(REGION)
  .database.ref("dbTests/{testId}/start")
  .onCreate(async (snapshot, context) => {
    const testId = context.params.testId;

    await admin
      .firestore()
      .collection("databaseRefOnCreateTests")
      .doc(testId)
      .set(
        sanitizeData({
          ...context,
          url: snapshot.ref.toString(),
        })
      );
  });

export const databaseRefOnDeleteTests: any = functions
  .region(REGION)
  .database.ref("dbTests/{testId}/start")
  .onDelete(async (snapshot, context) => {
    const testId = context.params.testId;

    await admin
      .firestore()
      .collection("databaseRefOnDeleteTests")
      .doc(testId)
      .set(
        sanitizeData({
          ...context,
          url: snapshot.ref.toString(),
        })
      );
  });

export const databaseRefOnUpdateTests: any = functions
  .region(REGION)
  .database.ref("dbTests/{testId}/start")
  .onUpdate(async (change, context) => {
    const testId = context.params.testId;
    const data = change.after.val();

    await admin
      .firestore()
      .collection("databaseRefOnUpdateTests")
      .doc(testId)
      .set(
        sanitizeData({
          ...context,
          url: change.after.ref.toString(),
          data: data ? JSON.stringify(data) : null,
        })
      );
  });

export const databaseRefOnWriteTests: any = functions
  .region(REGION)
  .database.ref("dbTests/{testId}/start")
  .onWrite(async (change, context) => {
    const testId = context.params.testId;
    if (change.after.val() === null) {
      functions.logger.info(`Event for ${testId} is null; presuming data cleanup, so skipping.`);
      return;
    }

    await admin
      .firestore()
      .collection("databaseRefOnWriteTests")
      .doc(testId)
      .set(
        sanitizeData({
          ...context,
          url: change.after.ref.toString(),
        })
      );
  });
