import * as admin from "firebase-admin";
import {
  onObjectArchived,
  onObjectDeleted,
  onObjectFinalized,
  onObjectMetadataUpdated,
} from "firebase-functions/v2/storage";
import { REGION } from "../region";

export const storageOnObjectArchiveTests = onObjectArchived(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.name?.split(".")[0];
    if (!testId) {
      console.error("TestId not found for storage onObjectArchived");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("storageOnObjectArchivedTests")
        .doc(testId)
        .set({ event: JSON.stringify(event) });
    } catch (error) {
      console.error(`Error in Storage onObjectArchived function for testId: ${testId}`, error);
    }
  }
);

export const storageOnDeleteTests = onObjectDeleted(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.name?.split(".")[0];
    if (!testId) {
      console.error("TestId not found for storage onObjectDeleted");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("storageOnObjectDeletedTests")
        .doc(testId)
        .set({ event: JSON.stringify(event) });
    } catch (error) {
      console.error(`Error in Storage onObjectDeleted function for testId: ${testId}`, error);
    }
  }
);

export const storageOnFinalizeTests = onObjectFinalized(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.name?.split(".")[0];
    if (!testId) {
      console.error("TestId not found for storage onObjectFinalized");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("storageOnObjectFinalizedTests")
        .doc(testId)
        .set({ event: JSON.stringify(event) });
    } catch (error) {
      console.error(`Error in Storage onObjectFinalized function for testId: ${testId}`, error);
    }
  }
);

export const storageOnMetadataUpdateTests = onObjectMetadataUpdated(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.name?.split(".")[0];
    if (!testId) {
      console.error("TestId not found for storage onObjectMetadataUpdated");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("storageOnObjectMetadataUpdatedTests")
        .doc(testId)
        .set({ event: JSON.stringify(event) });
    } catch (error) {
      console.error(
        `Error in Storage onObjectMetadataUpdated function for testId: ${testId}`,
        error
      );
    }
  }
);
