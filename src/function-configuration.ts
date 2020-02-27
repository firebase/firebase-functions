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

export interface RuntimeOptions {
  /**
   * Amount of memory to allocate to the function.
   */
  memory?: typeof VALID_MEMORY_OPTIONS[number];
  /**
   * Timeout for the function in seconds, possible values are 0 to 540.
   */
  timeoutSeconds?: number;

  /**
   * Max number of actual instances allowed to be running in parallel
   */
  maxInstances?: number;
}

export interface DeploymentOptions extends RuntimeOptions {
  regions?: Array<typeof SUPPORTED_REGIONS[number]>;
  schedule?: Schedule;
}
