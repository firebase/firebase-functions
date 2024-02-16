import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const firestoreOnDocumentCreatedTests = onDocumentCreated(
  {
    document: "tests/{documentId}",
    region: REGION,
    timeoutSeconds: 540,
  },
  async (event) => {
    functions.logger.debug(event);
    const documentId = event.params.documentId;

    await admin
      .firestore()
      .collection("firestoreOnDocumentCreatedTests")
      .doc(documentId)
      .set(
        sanitizeData({
          time: event.time,
          id: event.id,
          type: event.type,
          source: event.source,
        })
      );
  }
);

export const firestoreOnDocumentDeletedTests = onDocumentDeleted(
  {
    document: "tests/{documentId}",
    region: REGION,
    timeoutSeconds: 540,
  },
  async (event) => {
    functions.logger.debug(event);
    const documentId = event.params.documentId;

    await admin
      .firestore()
      .collection("firestoreOnDocumentDeletedTests")
      .doc(documentId)
      .set(
        sanitizeData({
          time: event.time,
          id: event.id,
          type: event.type,
          source: event.source,
        })
      );
  }
);

export const firestoreOnDocumentUpdatedTests = onDocumentUpdated(
  {
    document: "tests/{documentId}",
    region: REGION,
    timeoutSeconds: 540,
  },
  async (event) => {
    functions.logger.debug(event);
    const documentId = event.params.documentId;

    await admin
      .firestore()
      .collection("firestoreOnDocumentUpdatedTests")
      .doc(documentId)
      .set(
        sanitizeData({
          time: event.time,
          id: event.id,
          type: event.type,
          source: event.source,
        })
      );
  }
);

export const firestoreOnDocumentWrittenTests = onDocumentWritten(
  {
    document: "tests/{documentId}",
    region: REGION,
    timeoutSeconds: 540,
  },
  async (event) => {
    functions.logger.debug(event);
    const documentId = event.params.documentId;

    await admin
      .firestore()
      .collection("firestoreOnDocumentWrittenTests")
      .doc(documentId)
      .set(
        sanitizeData({
          time: event.time,
          id: event.id,
          type: event.type,
          source: event.source,
        })
      );
  }
);
