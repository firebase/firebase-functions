import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {
  onObjectDeleted,
  onObjectFinalized,
  onObjectMetadataUpdated,
} from "firebase-functions/v2/storage";
import { REGION } from "../region";

export const storageOnDeleteTests = onObjectDeleted(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.name?.split(".")[0];
    if (!testId) {
      functions.logger.error("TestId not found for storage onObjectDeleted");
      return;
    }

    await admin.firestore().collection("storageOnObjectDeletedTests").doc(testId).set({
      id: event.id,
      time: event.time,
      type: event.type,
      source: event.source,
    });
  }
);

export const storageOnFinalizeTests = onObjectFinalized(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.name?.split(".")[0];
    if (!testId) {
      functions.logger.error("TestId not found for storage onObjectFinalized");
      return;
    }

    await admin.firestore().collection("storageOnObjectFinalizedTests").doc(testId).set({
      id: event.id,
      time: event.time,
      type: event.type,
      source: event.source,
    });
  }
);

export const storageOnMetadataUpdateTests = onObjectMetadataUpdated(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.name?.split(".")[0];
    if (!testId) {
      functions.logger.error("TestId not found for storage onObjectMetadataUpdated");
      return;
    }
    await admin.firestore().collection("storageOnObjectMetadataUpdatedTests").doc(testId).set({
      id: event.id,
      time: event.time,
      type: event.type,
      source: event.source,
    });
  }
);
