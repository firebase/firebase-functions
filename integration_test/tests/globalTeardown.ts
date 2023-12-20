import * as admin from "firebase-admin";
import { initializeFirebase } from "./firebaseSetup";

async function deleteCollection(
  db: admin.firestore.Firestore,
  collectionPath: string,
  batchSize: number
) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, batchSize, resolve, reject).then(resolve).catch(reject);
  });
}

async function deleteQueryBatch(
  db: admin.firestore.Firestore,
  query: admin.firestore.Query<admin.firestore.DocumentData>,
  batchSize: number,
  resolve: (value?: unknown) => void,
  reject: (reason: any) => void
): Promise<void> {
  try {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
      resolve();
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    process.nextTick(() => deleteQueryBatch(db, query, batchSize, resolve, reject));
  } catch (error) {
    reject(error);
  }
}

export default async () => {
  await initializeFirebase();

  try {
    // TODO: Only delete resources created by this test run.
    // const db = admin.firestore();
    // await Promise.all([
    //   deleteCollection(db, "userProfiles", 100),
    //   deleteCollection(db, "createUserTests", 100),
    //   deleteCollection(db, "deleteUserTests", 100),
    //   deleteCollection(db, "databaseOnWriteTests", 100),
    //   deleteCollection(db, "firestoreOnCreateTests", 100),
    //   deleteCollection(db, "firestoreOnUpdateTests", 100),
    //   deleteCollection(db, "firestoreOnDeleteTests", 100),
    //   deleteCollection(db, "httpsOnCallTests", 100),
    //   deleteCollection(db, "pubsubOnPublishTests", 100),
    //   deleteCollection(db, "pubsubScheduleTests", 100),
    //   deleteCollection(db, "tests", 100),
    // ]);
  } catch (error) {
    console.error("Error in global teardown:", error);
  }

  await admin.app().delete();
};
