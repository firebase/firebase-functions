import * as admin from "firebase-admin";
import { logger } from "../src/logger";

/**
 * Initializes Firebase Admin SDK.
 */
export async function initializeFirebase(): Promise<admin.app.App> {
  if (admin.apps.length === 0) {
    try {
      // const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      // if (!serviceAccountPath) {
      //   throw new Error("Environment configured incorrectly.");
      // }
      // const serviceAccount = await import(serviceAccountPath);
      return admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.DATABASE_URL,
        storageBucket: process.env.STORAGE_BUCKET,
        projectId: process.env.PROJECT_ID,
      });
    } catch (error) {
      logger.error("Error initializing Firebase:", error);
    }
  }
  return admin.app();
}
