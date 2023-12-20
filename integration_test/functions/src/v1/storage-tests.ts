import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const storageOnFinalizeTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .storage.bucket()
  .object()
  .onFinalize(async (object, context) => {
    const testId = object.name?.split(".")[0];
    if (!testId) {
      console.error("TestId not found for storage object finalize");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("storageOnFinalizeTests")
        .doc(testId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(`Error in Storage onFinalize function for testId: ${testId}`, error);
    }
  });

export const storageOnArchiveTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .storage.bucket()
  .object()
  .onArchive(async (object, context) => {
    const testId = object.name?.split(".")[0];
    if (!testId) {
      console.error("TestId not found for storage object archive");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("storageOnArchiveTests")
        .doc(testId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(`Error in Storage onArchive function for testId: ${testId}`, error);
    }
  });

export const storageOnDeleteTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .storage.bucket()
  .object()
  .onDelete(async (object, context) => {
    const testId = object.name?.split(".")[0];
    if (!testId) {
      console.error("TestId not found for storage object delete");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("storageOnDeleteTests")
        .doc(testId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(`Error in Storage onDelete function for testId: ${testId}`, error);
    }
  });

export const storageOnMetadataUpdateTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .storage.bucket()
  .object()
  .onDelete(async (object, context) => {
    const testId = object.name?.split(".")[0];
    if (!testId) {
      console.error("TestId not found for storage object metadata update");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("storageOnMetadataUpdateTests")
        .doc(testId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(`Error in Storage onDelete function for testId: ${testId}`, error);
    }
  });
