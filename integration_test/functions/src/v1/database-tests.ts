import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const databaseRefOnWriteTests: any = functions
  .region(REGION)
  .database.ref("dbTests/{testId}/start")
  .onWrite(async (change, context) => {
    const testId = context.params.testId;
    if (change.after.val() === null) {
      functions.logger.info(`Event for ${testId} is null; presuming data cleanup, so skipping.`);
      return;
    }

    try {
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
    } catch (error) {
      console.error(`Error in Database ref onWrite function for testId: ${testId}`, error);
    }
  });

export const databaseRefOnCreateTests: any = functions
  .region(REGION)
  .database.ref("dbTests/{testId}/start")
  .onCreate(async (snapshot, context) => {
    const testId = context.params.testId;

    try {
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
    } catch (error) {
      console.error(`Error in Database ref onCreate function for testId: ${testId}`, error);
    }
  });

export const databaseRefOnUpdateTests: any = functions
  .region(REGION)
  .database.ref("dbTests/{testId}/start")
  .onUpdate(async (change, context) => {
    const testId = context.params.testId;

    try {
      await admin
        .firestore()
        .collection("databaseRefOnUpdateTests")
        .doc(testId)
        .set(
          sanitizeData({
            ...context,
            url: change.after.ref.toString(),
          })
        );
    } catch (error) {
      console.error(`Error in Database ref onUpdate function for testId: ${testId}`, error);
    }
  });

export const databaseRefOnDeleteTests: any = functions
  .region(REGION)
  .database.ref("dbTests/{testId}/start")
  .onDelete(async (snapshot, context) => {
    const testId = context.params.testId;

    try {
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
    } catch (error) {
      console.error(`Error in Database ref onDelete function for testId: ${testId}`, error);
    }
  });
