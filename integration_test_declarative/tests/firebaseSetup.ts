import * as admin from "firebase-admin";

/**
 * Initializes Firebase Admin SDK.
 */
export function initializeFirebase(): admin.app.App {
  if (admin.apps.length === 0) {
    try {
      const projectId = process.env.PROJECT_ID || "functions-integration-tests";

      // Check if we're in Cloud Build (ADC available) or local (need service account file)
      let credential;
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS !== '{}') {
        // Use service account file if specified and not a dummy file
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        credential = admin.credential.cert(serviceAccountPath);
      } else {
        // Use Application Default Credentials (for Cloud Build)
        credential = admin.credential.applicationDefault();
      }

      return admin.initializeApp({
        credential: credential,
        databaseURL:
          process.env.DATABASE_URL ||
          "https://functions-integration-tests-default-rtdb.firebaseio.com/",
        storageBucket:
          process.env.STORAGE_BUCKET || "gs://functions-integration-tests.firebasestorage.app",
        projectId: projectId,
      });
    } catch (error) {
      console.error("Error initializing Firebase:", error);
    }
  }
  return admin.app();
}
