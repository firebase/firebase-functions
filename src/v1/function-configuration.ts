import { Expression } from "../params";
import { ResetValue } from "../common/options";
import { SecretParam } from "../params/types";

export { RESET_VALUE } from "../common/options";

/**
 * List of all regions supported by Cloud Functions.
 */
export const SUPPORTED_REGIONS = [
  "us-central1",
  "us-east1",
  "us-east4",
  "us-west2",
  "us-west3",
  "us-west4",
  "europe-central2",
  "europe-west1",
  "europe-west2",
  "europe-west3",
  "europe-west6",
  "asia-east1",
  "asia-east2",
  "asia-northeast1",
  "asia-northeast2",
  "asia-northeast3",
  "asia-south1",
  "asia-southeast1",
  "asia-southeast2",
  "northamerica-northeast1",
  "southamerica-east1",
  "australia-southeast1",
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
  "128MB",
  "256MB",
  "512MB",
  "1GB",
  "2GB",
  "4GB",
  "8GB",
] as const;

/**
 * List of available options for VpcConnectorEgressSettings.
 */
export const VPC_EGRESS_SETTINGS_OPTIONS = [
  "VPC_CONNECTOR_EGRESS_SETTINGS_UNSPECIFIED",
  "PRIVATE_RANGES_ONLY",
  "ALL_TRAFFIC",
] as const;

/**
 * List of available options for IngressSettings.
 */
export const INGRESS_SETTINGS_OPTIONS = [
  "INGRESS_SETTINGS_UNSPECIFIED",
  "ALLOW_ALL",
  "ALLOW_INTERNAL_ONLY",
  "ALLOW_INTERNAL_AND_GCLB",
] as const;

/**
 * Scheduler retry options. Applies only to scheduled functions.
 */
export interface ScheduleRetryConfig {
  /**
   * The number of attempts that the system will make to run a job using the exponential backoff procedure described by {@link ScheduleRetryConfig.maxDoublings}.
   *
   * @defaultValue 0 (infinite retry)
   */
  retryCount?: number | Expression<number> | ResetValue;
  /**
   * The time limit for retrying a failed job, measured from time when an execution was first attempted.
   *
   * If specified with {@link ScheduleRetryConfig.retryCount}, the job will be retried until both limits are reached.
   *
   * @defaultValue 0
   */
  maxRetryDuration?: string | Expression<string> | ResetValue;
  /**
   * The minimum amount of time to wait before retrying a job after it fails.
   *
   * @defaultValue 5 seconds
   */
  minBackoffDuration?: string | Expression<string> | ResetValue;
  /**
   * The maximum amount of time to wait before retrying a job after it fails.
   *
   * @defaultValue 1 hour
   */
  maxBackoffDuration?: string | Expression<string> | ResetValue;
  /**
   * The max number of backoff doubling applied at each retry.
   *
   * @defaultValue 5
   */
  maxDoublings?: number | Expression<number> | ResetValue;
}

/**
 * Configuration options for scheduled functions.
 */
export interface Schedule {
  /**
   * Describes the schedule on which the job will be executed.
   *
   * The schedule can be either of the following types:
   *
   * 1. {@link https://en.wikipedia.org/wiki/Cron#Overview | Crontab}
   *
   * 2. English-like {@link https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules | schedule}
   *
   * @example
   * ```
   * // Crontab schedule
   * schedule: "0 9 * * 1"` // Every Monday at 09:00 AM
   *
   * // English-like schedule
   * schedule: "every 5 minutes"
   * ```
   */
  schedule: string;
  /**
   * Specifies the time zone to be used in interpreting {@link Schedule.schedule}.
   *
   * The value of this field must be a time zone name from the tz database.
   */
  timeZone?: string | ResetValue;
  /**
   * Settings that determine the retry behavior.
   */
  retryConfig?: ScheduleRetryConfig;
}

/**
 * Configuration option for failure policy on background functions.
 */
export interface FailurePolicy {
  /**
   * Retry configuration. Must be an empty object.
   *
   */
  retry: Record<string, never>;
}

export const MAX_NUMBER_USER_LABELS = 58;

/**
 * Configuration options for a function that applicable at runtime.
 */
export interface RuntimeOptions {
  /**
   * Which platform should host the backend. Valid options are "gcfv1"
   * @internal
   */
  platform?: "gcfv1";

  /**
   * Failure policy of the function, with boolean `true` being equivalent to
   * providing an empty retry object.
   */
  failurePolicy?: FailurePolicy | boolean;
  /**
   * Amount of memory to allocate to the function.
   */
  memory?: typeof VALID_MEMORY_OPTIONS[number] | Expression<number> | ResetValue;
  /**
   * Timeout for the function in seconds, possible values are 0 to 540.
   */
  timeoutSeconds?: number | Expression<number> | ResetValue;

  /**
   * Min number of actual instances to be running at a given time.
   *
   * @remarks
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   */
  minInstances?: number | Expression<number> | ResetValue;

  /**
   * Max number of actual instances allowed to be running in parallel.
   */
  maxInstances?: number | Expression<number> | ResetValue;

  /**
   * Connect cloud function to specified VPC connector.
   */
  vpcConnector?: string | ResetValue;

  /**
   * Egress settings for VPC connector.
   */
  vpcConnectorEgressSettings?: typeof VPC_EGRESS_SETTINGS_OPTIONS[number] | ResetValue;

  /**
   * Specific service account for the function to run as.
   */
  serviceAccount?: "default" | string | ResetValue;

  /**
   * Ingress settings which control where this function can be called from.
   */
  ingressSettings?: typeof INGRESS_SETTINGS_OPTIONS[number] | ResetValue;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /**
   * Invoker to set access control on https functions.
   */
  invoker?: "public" | "private" | string | string[];

  /*
   * Secrets to bind to a function instance.
   */
  secrets?: (string | SecretParam)[];

  /**
   * Determines whether Firebase AppCheck is enforced.
   *
   * @remarks
   * When true, requests with invalid tokens autorespond with a 401
   * (Unauthorized) error.
   * When false, requests with invalid tokens set context.app to undefiend.
   */
  enforceAppCheck?: boolean;
}

/**
 * Configuration options for a function that applies during function deployment.
 */
export interface DeploymentOptions extends RuntimeOptions {
  /**
   * Regions where function should be deployed.
   */
  regions?: Array<typeof SUPPORTED_REGIONS[number] | string>;
  /**
   * Schedule for the scheduled function.
   */
  schedule?: Schedule;
  /**
   * Controls whether function configuration modified outside of function source is preserved. Defaults to false.
   *
   * @remarks
   * When setting configuration available in the underlying platform that is not yet available in the Firebase Functions
   * SDK, we highly recommend setting `preserveExternalChanges` to `true`. Otherwise, when the Firebase Functions SDK releases
   * a new version of the SDK with support for the missing configuration, your function's manually configured setting
   * may inadvertently be wiped out.
   */
  preserveExternalChanges?: boolean;
}
