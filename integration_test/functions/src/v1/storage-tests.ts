import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

// TODO: (b/372315689) Re-enable function once bug is fixed
// export const storageOnDeleteTests: any = functions
//   .runWith({
//     timeoutSeconds: 540,
//   })
//   .region(REGION)
//   .storage.bucket()
//   .object()
//   .onDelete(async (object, context) => {
//     const testId = object.name?.split(".")[0];
//     if (!testId) {
//       functions.logger.error("TestId not found for storage object delete");
//       return;
//     }
//
//     await admin
//       .firestore()
//       .collection("storageOnDeleteTests")
//       .doc(testId)
//       .set(sanitizeData(context));
//   });

export const storageOnFinalizeTests = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .storage.bucket()
  .object()
  .onFinalize(async (object: unknown, context) => {
    if (!object || typeof object !== "object" || !("name" in object)) {
      functions.logger.error("Invalid object structure for storage object finalize");
      return;
    }
    const name = (object as { name: string }).name;
    if (!name || typeof name !== "string") {
      functions.logger.error("Invalid name property for storage object finalize");
      return;
    }
    const testId = name.split(".")[0];

    await admin
      .firestore()
      .collection("storageOnFinalizeTests")
      .doc(testId)
      .set(sanitizeData(context));
  });

export const storageOnMetadataUpdateTests = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .storage.bucket()
  .object()
  .onMetadataUpdate(async (object, context) => {
    const testId = object.name?.split(".")[0];
    if (!testId) {
      functions.logger.error("TestId not found for storage object metadata update");
      return;
    }
    await admin
      .firestore()
      .collection("storageOnMetadataUpdateTests")
      .doc(testId)
      .set(sanitizeData(context));
  });
