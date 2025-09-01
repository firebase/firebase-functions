/**
 * Environment variable validation and loading
 */

import { TestConfig, ValidRuntime, VALID_RUNTIMES } from "../utils/types.js";
import { logger } from "../utils/logger.js";

interface EnvironmentVariables {
  PROJECT_ID: string;
  DATABASE_URL: string;
  STORAGE_BUCKET: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_API_KEY: string;
  TEST_RUNTIME: string;
  NODE_VERSION?: string;
  FIREBASE_ADMIN?: string;
  REGION?: string;
  STORAGE_REGION?: string;
  DEBUG?: string;
}

/**
 * Validates that all required environment variables are set
 * @throws Error if validation fails
 */
export function validateEnvironment(): EnvironmentVariables {
  const required = [
    "PROJECT_ID",
    "DATABASE_URL",
    "STORAGE_BUCKET",
    "FIREBASE_APP_ID",
    "FIREBASE_MEASUREMENT_ID",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_API_KEY",
    // "GOOGLE_ANALYTICS_API_SECRET",  // Commented out like in original
    "TEST_RUNTIME",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Required environment variables are missing: ${missing.join(", ")}`);
    process.exit(1);
  }

  const testRuntime = process.env.TEST_RUNTIME as string;
  if (!VALID_RUNTIMES.includes(testRuntime as ValidRuntime)) {
    logger.error(`Invalid TEST_RUNTIME: ${testRuntime}. Must be either 'node' or 'python'.`);
    process.exit(1);
  }

  return {
    PROJECT_ID: process.env.PROJECT_ID!,
    DATABASE_URL: process.env.DATABASE_URL!,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET!,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID!,
    FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID!,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN!,
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY!,
    TEST_RUNTIME: testRuntime,
    NODE_VERSION: process.env.NODE_VERSION,
    FIREBASE_ADMIN: process.env.FIREBASE_ADMIN,
    REGION: process.env.REGION,
    STORAGE_REGION: process.env.STORAGE_REGION,
    DEBUG: process.env.DEBUG,
  };
}

/**
 * Loads and validates environment configuration
 * @returns TestConfig object with all validated environment variables
 */
export function loadTestConfig(): TestConfig {
  const env = validateEnvironment();
  const runtime = env.TEST_RUNTIME as ValidRuntime;

  // Determine Firebase Admin version based on runtime
  let firebaseAdmin = env.FIREBASE_ADMIN;
  if (!firebaseAdmin) {
    firebaseAdmin = runtime === "node" ? "^12.0.0" : "6.5.0";
  }

  const testRunId = `t${Date.now()}`;

  return {
    projectId: env.PROJECT_ID,
    testRunId,
    runtime,
    nodeVersion: env.NODE_VERSION || "18",
    firebaseAdmin,
    region: env.REGION || "us-central1",
    storageRegion: env.STORAGE_REGION || "us-central1",
    debug: env.DEBUG,
    databaseUrl: env.DATABASE_URL,
    storageBucket: env.STORAGE_BUCKET,
    firebaseAppId: env.FIREBASE_APP_ID,
    firebaseMeasurementId: env.FIREBASE_MEASUREMENT_ID,
    firebaseAuthDomain: env.FIREBASE_AUTH_DOMAIN,
    firebaseApiKey: env.FIREBASE_API_KEY,
  };
}
