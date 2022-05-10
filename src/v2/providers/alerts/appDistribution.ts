import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';
import { FirebaseAlertData, getEndpointAnnotation } from './alerts';

/**
 * The internal payload object for adding a new tester device to app distribution.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewTesterDevicePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.AppDistroNewTesterIosDevicePayload';
  /** Name of the tester */
  testerName: string;
  /** Email of the tester */
  testerEmail: string;
  /** The device model name */
  testerDeviceModelName: string;
  /** The device ID */
  testerDeviceIdentifier: string;
}

/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 */
export interface AppDistributionEvent<T>
  extends CloudEvent<FirebaseAlertData<T>> {
  /** The type of the alerts that got triggered. */
  alertType: string;
  /** The Firebase App ID that’s associated with the alert. */
  appId: string;
}

/** @internal */
export const newTesterIosDeviceAlert = 'appDistribution.newTesterIosDevice';

/**
 * Configuration for app distribution functions.
 */
export interface AppDistributionOptions extends options.EventHandlerOptions {
  /** An optional app ID to filter events by. */
  appId?: string;

  /**
   * Region where functions should be deployed.
   */
  region?: options.SupportedRegion | string;

  /**
   * Amount of memory to allocate to a function.
   * A value of null restores the defaults of 256MB.
   */
  memory?: options.MemoryOption | null;

  /**
   * Timeout for the function in sections, possible values are 0 to 540.
   * HTTPS functions can specify a higher timeout.
   * A value of null restores the default of 60s
   * The minimum timeout for a gen 2 function is 1s. The maximum timeout for a
   * function depends on the type of function: Event handling functions have a
   * maximum timeout of 540s (9 minutes). HTTPS and callable functions have a
   * maximum timeout of 36,00s (1 hour). Task queue functions have a maximum
   * timeout of 1,800s (30 minutes)
   */
  timeoutSeconds?: number | null;

  /**
   * Min number of actual instances to be running at a given time.
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   * A value of null restores the default min instances.
   */
  minInstances?: number | null;

  /**
   * Max number of instances to be running in parallel.
   * A value of null restores the default max instances.
   */
  maxInstances?: number | null;

  /**
   * Number of requests a function can serve at once.
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU >= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   * The maximum value for concurrency is 1,000.
   */
  concurrency?: number | null;

  /**
   * Fractional number of CPUs to allocate to a function.
   * Defaults to 1 for functions with <= 2GB RAM and increases for larger memory sizes.
   * This is different from the defaults when using the gcloud utility and is different from
   * the fixed amount assigned in Google Cloud Functions generation 1.
   * To revert to the CPU amounts used in gcloud or in Cloud Functions generation 1, set this
   * to the value "gcf_gen1"
   */
  cpu?: number | 'gcf_gen1';

  /**
   * Connect cloud function to specified VPC connector.
   * A value of null removes the VPC connector
   */
  vpcConnector?: string | null;

  /**
   * Egress settings for VPC connector.
   * A value of null turns off VPC connector egress settings
   */
  vpcConnectorEgressSettings?: options.VpcEgressSetting | null;

  /**
   * Specific service account for the function to run as.
   * A value of null restores the default service account.
   */
  serviceAccount?: string | null;

  /**
   * Ingress settings which control where this function can be called from.
   * A value of null turns off ingress settings.
   */
  ingressSettings?: options.IngressSetting | null;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /*
   * Secrets to bind to a functions.
   */
  secrets?: string[];

  /** Whether failed executions should be delivered again. */
  retry?: boolean;
}

/**
 * Declares a function that can handle adding a new tester iOS device.
 */
export function onNewTesterIosDevicePublished(
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>>;
export function onNewTesterIosDevicePublished(
  appId: string,
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>>;
export function onNewTesterIosDevicePublished(
  opts: AppDistributionOptions,
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>>;
export function onNewTesterIosDevicePublished(
  appIdOrOptsOrHandler:
    | string
    | AppDistributionOptions
    | ((
        event: AppDistributionEvent<NewTesterDevicePayload>
      ) => any | Promise<any>),
  handler?: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>> {
  if (typeof appIdOrOptsOrHandler === 'function') {
    handler = appIdOrOptsOrHandler as (
      event: AppDistributionEvent<NewTesterDevicePayload>
    ) => any | Promise<any>;
    appIdOrOptsOrHandler = {};
  }

  const [opts, appId] = getOptsAndApp(appIdOrOptsOrHandler);

  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as AppDistributionEvent<NewTesterDevicePayload>);
  };

  func.run = handler;
  func.__endpoint = getEndpointAnnotation(opts, newTesterIosDeviceAlert, appId);

  return func;
}

/**
 * @internal
 * Helper function to parse the function opts and appId.
 */
export function getOptsAndApp(
  appIdOrOpts: string | AppDistributionOptions
): [options.EventHandlerOptions, string | undefined] {
  let opts: options.EventHandlerOptions;
  let appId: string | undefined;
  if (typeof appIdOrOpts === 'string') {
    opts = {};
    appId = appIdOrOpts;
  } else {
    appId = appIdOrOpts.appId;
    opts = { ...appIdOrOpts };
    delete (opts as any).appId;
  }
  return [opts, appId];
}
