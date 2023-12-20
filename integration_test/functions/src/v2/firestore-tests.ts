import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const firestoreOnDocumentCreatedTests = onDocumentCreated(
  {
    document: "tests/{documentId}",
    region: REGION,
    timeoutSeconds: 540,
  },
  async (event) => {
    const documentId = event.params.documentId;
    try {
      await admin
        .firestore()
        .collection("firestoreOnDocumentCreatedTests")
        .doc(documentId)
        .set(sanitizeData(event));
    } catch (error) {
      console.error(`Error creating test record for testId: ${documentId}`, error);
    }
  }
);

export const firestoreOnDocumentDeletedTests = onDocumentDeleted(
  {
    document: "tests/{documentId}",
    region: REGION,
    timeoutSeconds: 540,
  },
  async (event) => {
    const documentId = event.params.documentId;
    try {
      await admin
        .firestore()
        .collection("firestoreOnDocumentCreatedTests")
        .doc(documentId)
        .set(sanitizeData(event));
    } catch (error) {
      console.error(`Error creating test record for testId: ${documentId}`, error);
    }
  }
);

export const firestoreOnDocumentUpdatedTests = onDocumentDeleted(
  {
    document: "tests/{documentId}",
    region: REGION,
    timeoutSeconds: 540,
  },
  async (event) => {
    const documentId = event.params.documentId;
    try {
      await admin
        .firestore()
        .collection("firestoreOnDocumentUpdatedTests")
        .doc(documentId)
        .set(sanitizeData(event));
    } catch (error) {
      console.error(`Error creating test record for testId: ${documentId}`, error);
    }
  }
);

export const firestoreOnDocumentWrittenTests = onDocumentDeleted(
  {
    document: "tests/{documentId}",
    region: REGION,
    timeoutSeconds: 540,
  },
  async (event) => {
    const documentId = event.params.documentId;
    try {
      await admin
        .firestore()
        .collection("firestoreOnDocumentWrittenTests")
        .doc(documentId)
        .set(sanitizeData(event));
    } catch (error) {
      console.error(`Error creating test record for testId: ${documentId}`, error);
    }
  }
);
