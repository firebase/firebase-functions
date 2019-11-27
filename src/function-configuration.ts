/**
 * List of all regions supported by Cloud Functions.
 */
export const SUPPORTED_REGIONS = [
  'us-central1',
  'us-east1',
  'us-east4',
  'europe-west1',
  'europe-west2',
  'asia-east2',
  'asia-northeast1',
] as const;

/**
 * Cloud Functions min timeout value.
 */
export const MIN_TIMEOUT_SECONDS = 0;

/**
 * Cloud Functions max timeout value.
 */
export const MAX_TIMEOUT_SECONDS = 540;

/**
 * List of available memory options supported by Cloud Functions.
 */
export const VALID_MEMORY_OPTIONS = [
  '128MB',
  '256MB',
  '512MB',
  '1GB',
  '2GB',
] as const;

/**
 * A mapping of memory options to its representation in the Cloud Functions API.
 */
export const MEMORY_LOOKUP: {
  [Name in typeof VALID_MEMORY_OPTIONS[number]]: number;
} = {
  '128MB': 128,
  '256MB': 256,
  '512MB': 512,
  '1GB': 1024,
  '2GB': 2048,
};

/**
 * Scheduler retry options. Applies only to scheduled functions.
 */
export interface ScheduleRetryConfig {
  retryCount?: number;
  maxRetryDuration?: string;
  minBackoffDuration?: string;
  maxBackoffDuration?: string;
  maxDoublings?: number;
}

/**
 * Configuration options for scheduled functions.
 */
export interface Schedule {
  schedule: string;
  timeZone?: string;
  retryConfig?: ScheduleRetryConfig;
}

export interface FailurePolicy {
  retry: {};
}

export const DEFAULT_FAILURE_POLICY: FailurePolicy = {
  retry: {},
};

export interface RuntimeOptions {
  /**
   * Failure policy of the function, with boolean `true` being equivalent to
   * providing an empty retry object.
   */
  failurePolicy?: FailurePolicy | boolean;
  /**
   * Amount of memory to allocate to the function.
   */
  memory?: typeof VALID_MEMORY_OPTIONS[number];
  /**
   * Timeout for the function in seconds, possible values are 0 to 540.
   */
  timeoutSeconds?: number;
}

export interface DeploymentOptions extends RuntimeOptions {
  regions?: Array<typeof SUPPORTED_REGIONS[number]>;
  schedule?: Schedule;
}
