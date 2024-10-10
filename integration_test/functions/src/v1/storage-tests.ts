import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
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
      functions.logger.error("TestId not found for storage object finalize");
      return;
    }

    await admin
      .firestore()
      .collection("storageOnFinalizeTests")
      .doc(testId)
      .set(sanitizeData(context));
  });

export const storageOnMetadataUpdateTests: any = functions
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
