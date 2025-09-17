import * as admin from "firebase-admin";

/**
 * Initializes Firebase Admin SDK.
 */
export function initializeFirebase(): admin.app.App {
  if (admin.apps.length === 0) {
    try {
      // Using the service account file in the project root
      const serviceAccountPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        "/Users/jacob/firebase-functions/integration_test_declarative/sa.json";

      const projectId = process.env.PROJECT_ID || "functions-integration-tests";

      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
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
