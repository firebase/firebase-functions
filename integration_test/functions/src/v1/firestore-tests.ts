import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const firestoreDocumentOnCreateTests = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{testId}")
  .onCreate(async (_snapshot, context) => {
    const testId = context.params.testId;
    await admin
      .firestore()
      .collection("firestoreDocumentOnCreateTests")
      .doc(testId)
      .set(sanitizeData(context));
  });

export const firestoreDocumentOnDeleteTests = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{testId}")
  .onDelete(async (_snapshot, context) => {
    const testId = context.params.testId;
    await admin
      .firestore()
      .collection("firestoreDocumentOnDeleteTests")
      .doc(testId)
      .set(sanitizeData(context));
  });

export const firestoreDocumentOnUpdateTests = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{testId}")
  .onUpdate(async (_change, context) => {
    const testId = context.params.testId;
    await admin
      .firestore()
      .collection("firestoreDocumentOnUpdateTests")
      .doc(testId)
      .set(sanitizeData(context));
  });

export const firestoreDocumentOnWriteTests = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{testId}")
  .onWrite(async (_change, context) => {
    const testId = context.params.testId;
    await admin
      .firestore()
      .collection("firestoreDocumentOnWriteTests")
      .doc(testId)
      .set(sanitizeData(context));
  });
