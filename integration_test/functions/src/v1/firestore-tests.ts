import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const firestoreDocumentOnCreateTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{documentId}")
  .onCreate(async (snapshot, context) => {
    const documentId = context.params.documentId;
    try {
      await admin
        .firestore()
        .collection("firestoreDocumentOnCreateTests")
        .doc(documentId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(
        `Error in Firestore document onCreate function for testId: ${documentId}`,
        error
      );
    }
  });

export const firestoreDocumentOnUpdateTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{documentId}")
  .onUpdate(async (change, context) => {
    const documentId = context.params.documentId;
    try {
      await admin
        .firestore()
        .collection("firestoreDocumentOnUpdateTests")
        .doc(documentId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(
        `Error in Firestore document onUpdate function for testId: ${documentId}`,
        error
      );
    }
  });

export const firestoreDocumentOnDeleteTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{documentId}")
  .onDelete(async (snapshot, context) => {
    const documentId = context.params.documentId;
    try {
      await admin
        .firestore()
        .collection("firestoreDocumentOnDeleteTests")
        .doc(documentId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(
        `Error in Firestore document onDelete function for testId: ${documentId}`,
        error
      );
    }
  });

export const firestoreDocumentOnWriteTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document("tests/{documentId}")
  .onWrite(async (change, context) => {
    const documentId = context.params.documentId;
    try {
      await admin
        .firestore()
        .collection("firestoreDocumentOnWriteTests")
        .doc(documentId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(
        `Error in Firestore document onWrite function for testId: ${documentId}`,
        error
      );
    }
  });
