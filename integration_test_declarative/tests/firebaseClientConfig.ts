/**
 * Firebase Client SDK Configuration for Integration Tests
 *
 * This configuration is safe to expose publicly as Firebase client SDK
 * configuration is designed to be public. Security comes from Firebase
 * Security Rules, not config secrecy.
 */

export const FIREBASE_CLIENT_CONFIG = {
  apiKey: "AIzaSyC1r437iUdYU33ecAdS3oUIF--cW8uk7Ek",
  authDomain: "functions-integration-tests.firebaseapp.com",
  databaseURL: "https://functions-integration-tests-default-rtdb.firebaseio.com",
  projectId: "functions-integration-tests",
  storageBucket: "functions-integration-tests.firebasestorage.app",
  messagingSenderId: "488933414559",
  appId: "1:488933414559:web:a64ddadca1b4ef4d40b4aa",
  measurementId: "G-DS379RHF58",
};

/**
 * Get Firebase client config for a specific project
 * Falls back to default config if project-specific config not found
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getFirebaseClientConfig(_projectId?: string) {
  // For now, we only have one test project config
  // In the future, you could add project-specific configs here
  return FIREBASE_CLIENT_CONFIG;
}
