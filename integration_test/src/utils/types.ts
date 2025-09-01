/**
 * Shared TypeScript interfaces and types for the integration test suite
 */

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
}

export interface FirebaseConfig {
  databaseURL: string;
  projectId: string;
  storageBucket: string;
}

export interface FirebaseProjectConfig {
  projectId: string;
  projectDir: string;
  sourceDir: string;
  runtime: string;
}

export interface EnvironmentConfig {
  DEBUG?: string;
  FIRESTORE_PREFER_REST: string;
  GCLOUD_PROJECT: string;
  FIREBASE_CONFIG: string;
  REGION: string;
  STORAGE_REGION: string;
}

export interface EndpointConfig {
  project?: string;
  runtime?: string;
  [key: string]: unknown;
}

export interface ModifiedYaml {
  endpoints: Record<string, EndpointConfig>;
  specVersion: string;
}

export interface FirebaseClient {
  functions: {
    list: (options?: any) => Promise<{ name: string }[]>;
    delete(names: string[], options: any): Promise<void>;
  };
  deploy: (options: any) => Promise<void>;
}

export type ValidRuntime = "node" | "python";
export const VALID_RUNTIMES: readonly ValidRuntime[] = ["node", "python"] as const;

export interface DeployOptions {
  only: string;
  force: boolean;
  project: string;
  debug: boolean;
  nonInteractive: boolean;
  cwd: string;
}

export interface FunctionListOptions {
  project: string;
  config: string;
  nonInteractive: boolean;
  cwd: string;
}

export interface TestResult {
  passed: boolean;
  output: string;
  error?: Error;
}
