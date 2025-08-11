import * as z from "zod/mini";

// Load English locale for better error messages
z.config(z.locales.en());

export interface TestConfig {
  projectId: string;
  testRunId: string;
  runtime: "node" | "python";
  nodeVersion: string;
  firebaseAdmin: string;
  region: string;
  storageRegion: string;
  debug?: string;
  databaseUrl: string;
  storageBucket: string;
  firebaseAppId: string;
  firebaseMeasurementId: string;
  firebaseAuthDomain: string;
  firebaseApiKey: string;
  googleAnalyticsApiSecret: string;
}

// Environment validation schema
const environmentSchema = z.object({
  PROJECT_ID: z.string().check(z.minLength(1, "PROJECT_ID is required")),
  DATABASE_URL: z.string().check(z.minLength(1, "DATABASE_URL is required")),
  STORAGE_BUCKET: z.string().check(z.minLength(1, "STORAGE_BUCKET is required")),
  FIREBASE_APP_ID: z.string().check(z.minLength(1, "FIREBASE_APP_ID is required")),
  FIREBASE_MEASUREMENT_ID: z.string().check(z.minLength(1, "FIREBASE_MEASUREMENT_ID is required")),
  FIREBASE_AUTH_DOMAIN: z.string().check(z.minLength(1, "FIREBASE_AUTH_DOMAIN is required")),
  FIREBASE_API_KEY: z.string().check(z.minLength(1, "FIREBASE_API_KEY is required")),
  GOOGLE_ANALYTICS_API_SECRET: z
    .string()
    .check(z.minLength(1, "GOOGLE_ANALYTICS_API_SECRET is required")),
  TEST_RUNTIME: z.enum(["node", "python"]),
  NODE_VERSION: z.optional(z.string()),
  FIREBASE_ADMIN: z.optional(z.string()),
  REGION: z.optional(z.string()),
  STORAGE_REGION: z.optional(z.string()),
  DEBUG: z.optional(z.string()),
});

/**
 * Validates that all required environment variables are set and have valid values.
 * Exits the process with code 1 if validation fails.
 */
export function validateEnvironment(): void {
  try {
    environmentSchema.parse(process.env);
  } catch (error) {
    console.error("Environment validation failed:");
    if (error && typeof error === "object" && "errors" in error) {
      const zodError = error as { errors: Array<{ path: string[]; message: string }> };
      zodError.errors.forEach((err) => {
        console.error(`  ${err.path.join(".")}: ${err.message}`);
      });
    } else {
      console.error("Unexpected error during environment validation:", error);
    }
    process.exit(1);
  }
}

/**
 * Loads and validates environment configuration, returning a typed config object.
 * @returns TestConfig object with all validated environment variables
 */
export function loadConfig(): TestConfig {
  // Validate environment first to ensure all required variables are set
  const validatedEnv = environmentSchema.parse(process.env);

  // TypeScript type guard to ensure TEST_RUNTIME is the correct type
  const validRuntimes = ["node", "python"] as const;
  type ValidRuntime = (typeof validRuntimes)[number];
  const runtime: ValidRuntime = validatedEnv.TEST_RUNTIME;

  let firebaseAdmin = validatedEnv.FIREBASE_ADMIN;
  if (!firebaseAdmin && runtime === "node") {
    firebaseAdmin = "^12.0.0";
  } else if (!firebaseAdmin && runtime === "python") {
    firebaseAdmin = "6.5.0";
  } else if (!firebaseAdmin) {
    throw new Error("FIREBASE_ADMIN is not set");
  }

  const testRunId = `t${Date.now()}`;

  return {
    projectId: validatedEnv.PROJECT_ID,
    testRunId,
    runtime,
    nodeVersion: validatedEnv.NODE_VERSION ?? "18",
    firebaseAdmin,
    region: validatedEnv.REGION ?? "us-central1",
    storageRegion: validatedEnv.STORAGE_REGION ?? "us-central1",
    debug: validatedEnv.DEBUG,
    databaseUrl: validatedEnv.DATABASE_URL,
    storageBucket: validatedEnv.STORAGE_BUCKET,
    firebaseAppId: validatedEnv.FIREBASE_APP_ID,
    firebaseMeasurementId: validatedEnv.FIREBASE_MEASUREMENT_ID,
    firebaseAuthDomain: validatedEnv.FIREBASE_AUTH_DOMAIN,
    firebaseApiKey: validatedEnv.FIREBASE_API_KEY,
    googleAnalyticsApiSecret: validatedEnv.GOOGLE_ANALYTICS_API_SECRET,
  };
}

/**
 * Creates Firebase configuration object for deployment.
 * @param config - The test configuration object
 * @returns Firebase configuration object
 */
export function createFirebaseConfig(config: TestConfig) {
  return {
    projectId: config.projectId,
    projectDir: process.cwd(),
    sourceDir: `${process.cwd()}/functions`,
    runtime: config.runtime === "node" ? "nodejs18" : "python311",
  };
}

/**
 * Creates environment configuration for function deployment.
 * @param config - The test configuration object
 * @returns Environment configuration object
 */
export function createEnvironmentConfig(config: TestConfig) {
  const firebaseConfig = {
    databaseURL: config.databaseUrl,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
  };

  return {
    DEBUG: config.debug,
    FIRESTORE_PREFER_REST: "true",
    GCLOUD_PROJECT: config.projectId,
    FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
    REGION: config.region,
    STORAGE_REGION: config.storageRegion,
  };
}
