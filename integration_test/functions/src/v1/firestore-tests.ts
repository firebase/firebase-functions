import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const firestoreDocumentOnCreateTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{testId}")
  .onCreate(async (snapshot, context) => {
    const testId = context.params.testId;
    await admin
      .firestore()
      .collection("firestoreDocumentOnCreateTests")
      .doc(testId)
      .set(sanitizeData(context));
  });

export const firestoreDocumentOnDeleteTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{testId}")
  .onDelete(async (snapshot, context) => {
    const testId = context.params.testId;
    await admin
      .firestore()
      .collection("firestoreDocumentOnDeleteTests")
      .doc(testId)
      .set(sanitizeData(context));
  });

export const firestoreDocumentOnUpdateTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{testId}")
  .onUpdate(async (change, context) => {
    const testId = context.params.testId;
    await admin
      .firestore()
      .collection("firestoreDocumentOnUpdateTests")
      .doc(testId)
      .set(sanitizeData(context));
  });

export const firestoreDocumentOnWriteTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{testId}")
  .onWrite(async (change, context) => {
    const testId = context.params.testId;
    await admin
      .firestore()
      .collection("firestoreDocumentOnWriteTests")
      .doc(testId)
      .set(sanitizeData(context));
  });
