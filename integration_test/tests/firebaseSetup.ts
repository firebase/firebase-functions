import * as admin from "firebase-admin";
import { cert } from "firebase-admin/app";

/**
 * Initializes Firebase Admin SDK.
 */
export async function initializeFirebase(): Promise<admin.app.App> {
  if (admin.apps.length === 0) {
    try {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (!serviceAccountPath) {
        throw new Error("Environment configured incorrectly.");
      }
      const serviceAccount = await import(serviceAccountPath);
      const app = admin.initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.DATABASE_URL,
        storageBucket: process.env.STORAGE_BUCKET,
        projectId: process.env.PROJECT_ID,
      });
      return app;
    } catch (error) {
      console.error("Error initializing Firebase:", error);
    }
  }
  return admin.app();
}
