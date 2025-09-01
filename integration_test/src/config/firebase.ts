/**
 * Firebase-specific configuration
 */

import {
  TestConfig,
  FirebaseConfig,
  FirebaseProjectConfig,
  EnvironmentConfig,
} from "../utils/types.js";

/**
 * Creates Firebase configuration from test config
 */
export function createFirebaseConfig(config: TestConfig): FirebaseConfig {
  return {
    databaseURL: config.databaseUrl,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
  };
}

/**
 * Creates Firebase project configuration for deployment
 */
export function createFirebaseProjectConfig(config: TestConfig): FirebaseProjectConfig {
  return {
    projectId: config.projectId,
    projectDir: process.cwd(),
    sourceDir: `${process.cwd()}/functions`,
    runtime: config.runtime === "node" ? "nodejs18" : "python311",
  };
}

/**
 * Creates environment configuration for Firebase functions
 */
export function createEnvironmentConfig(
  config: TestConfig,
  firebaseConfig: FirebaseConfig
): EnvironmentConfig {
  return {
    DEBUG: config.debug,
    FIRESTORE_PREFER_REST: "true",
    GCLOUD_PROJECT: config.projectId,
    FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
    REGION: config.region,
    STORAGE_REGION: config.storageRegion,
  };
}
