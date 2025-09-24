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

export const FIREBASE_V2_CLIENT_CONFIG = {
  apiKey: "AIzaSyCuJHyzpwIkQbxvJdKAzXg3sHUBOcTmsTI",
  authDomain: "functions-integration-tests-v2.firebaseapp.com",
  projectId: "functions-integration-tests-v2",
  storageBucket: "functions-integration-tests-v2.firebasestorage.app",
  messagingSenderId: "404926458259",
  appId: "1:404926458259:web:eaab8474bc5a6833c66066",
  measurementId: "G-D64JVJJSX7",
};

/**
 * Get Firebase client config for a specific project
 * Falls back to default config if project-specific config not found
 */
export function getFirebaseClientConfig(projectId?: string) {
  if (projectId === "functions-integration-tests-v2") {
    return FIREBASE_V2_CLIENT_CONFIG;
  }
  return FIREBASE_CLIENT_CONFIG;
}
