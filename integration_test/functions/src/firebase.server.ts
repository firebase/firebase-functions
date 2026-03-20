import admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";
import { applicationDefault } from "firebase-admin/app";
import { getFunctions } from "firebase-admin/functions";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";
import { getRemoteConfig } from "firebase-admin/remote-config";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "./config";
import { getStorage } from "firebase-admin/storage";

export const app = admin.initializeApp({
  credential: applicationDefault(),
  projectId: config.projectId,
  databaseURL: config.databaseURL,
});

export const firestore = getFirestore(app);
firestore.settings({ ignoreUndefinedProperties: true });
export const database = getDatabase(app);
export const auth = getAuth(app);
export const remoteConfig = getRemoteConfig(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// See https://github.com/firebase/functions-samples/blob/a6ae4cbd3cf2fff3e2b97538081140ad9befd5d8/Node/taskqueues-backup-images/functions/index.js#L111-L128
export async function getFunctionUrl(name: string) {
  const auth = new GoogleAuth({
    projectId: config.projectId,
  });

  const url = `https://cloudfunctions.googleapis.com/v2beta/projects/${config.projectId}/locations/us-central1/functions/${name}`;
  const client = await auth.getClient();
  const res: any = await client.request({ url });
  const uri = res.data?.serviceConfig?.uri;

  if (!uri) {
    throw new Error(`Function ${name} not found`);
  }

  return uri;
}
