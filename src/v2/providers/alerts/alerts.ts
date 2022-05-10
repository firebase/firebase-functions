import { ManifestEndpoint } from '../../../runtime/manifest';
import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';

/**
 * The CloudEvent data emitted by Firebase Alerts.
 * @typeParam T - the payload type that is expected for this alert.
 */
export interface FirebaseAlertData<T = any> {
  /** Time that the event has created. */
  createTime: string;
  /** Time that the event has ended. Optional, only present for ongoing alerts. */
  endTime: string;
  /** Payload of the event, which includes the details of the specific alert. */
  payload: T;
}

/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 * @typeParam T - the data type for this alert that is wrapped in a `FirebaseAlertData` object.
 */
export interface AlertEvent<T> extends CloudEvent<FirebaseAlertData<T>> {
  /** The type of the alerts that got triggered. */
  alertType: string;
  /**
   * The Firebase App ID that’s associated with the alert. This is optional,
   * and only present when the alert is targeting at a specific Firebase App.
   */
  appId?: string;

  /** Data for an `AlertEvent` is a `FirebaseAlertData` object with a given payload. */
  data: FirebaseAlertData<T>;
}

/** @internal */
export const eventType = 'google.firebase.firebasealerts.alerts.v1.published';

/** The underlying alert type of the Firebase Alerts provider. */
export type AlertType =
  | 'crashlytics.newFatalIssue'
  | 'crashlytics.newNonfatalIssue'
  | 'crashlytics.regression'
  | 'crashlytics.stabilityDigest'
  | 'crashlytics.velocity'
  | 'crashlytics.newAnrIssue'
  | 'billing.planUpdate'
  | 'billing.automatedPlanUpdate'
  | 'appDistribution.newTesterIosDevice'
  | string;

/**
 * Configuration for Firebase Alert functions.
 */
export interface FirebaseAlertOptions extends options.EventHandlerOptions {
  /** Scope the handler to trigger on an alert type. */
  alertType: AlertType;

  /** Scope the function to trigger on a specific application. */
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
   * Secrets to bind to a function.
   */
  secrets?: string[];

  /** Whether failed executions should be delivered again. */
  retry?: boolean;
}

/**
 * Declares a function that can handle Firebase Alerts from CloudEvents.
 * @typeParam T - the type of event.data.payload.
 * @param alertType - the alert type or Firebase Alert function configuration.
 * @param handler a function that can handle the Firebase Alert inside a CloudEvent.
 * @returns A function that you can export and deploy.
 */
export function onAlertPublished<T extends { ['@type']: string } = any>(
  alertType: AlertType,
  handler: (event: AlertEvent<T>) => any | Promise<any>
): CloudFunction<AlertEvent<T>>;

/**
 * Declares a function that can handle Firebase Alerts from CloudEvents.
 * @typeParam T - the type of event.data.payload.
 * @param options - the alert type and other options for this cloud function.
 * @param handler a function that can handle the Firebase Alert inside a CloudEvent.
 */
export function onAlertPublished<T extends { ['@type']: string } = any>(
  options: FirebaseAlertOptions,
  handler: (event: AlertEvent<T>) => any | Promise<any>
): CloudFunction<AlertEvent<T>>;

export function onAlertPublished<T extends { ['@type']: string } = any>(
  alertTypeOrOpts: AlertType | FirebaseAlertOptions,
  handler: (event: AlertEvent<T>) => any | Promise<any>
): CloudFunction<AlertEvent<T>> {
  const [opts, alertType, appId] = getOptsAndAlertTypeAndApp(alertTypeOrOpts);

  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as AlertEvent<T>);
  };

  func.run = handler;
  func.__endpoint = getEndpointAnnotation(opts, alertType, appId);

  return func;
}

/**
 * Helper function for getting the endpoint annotation used in alert handling functions.
 * @internal
 */
export function getEndpointAnnotation(
  opts: options.EventHandlerOptions,
  alertType: string,
  appId?: string
): ManifestEndpoint {
  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts);
  const endpoint: ManifestEndpoint = {
    platform: 'gcfv2',
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType,
      eventFilters: {
        alerttype: alertType,
      },
      retry: !!opts.retry,
    },
  };
  if (appId) {
    endpoint.eventTrigger.eventFilters.appid = appId;
  }
  return endpoint;
}

/**
 * Helper function to parse the function opts, alert type, and appId.
 * @internal
 */
export function getOptsAndAlertTypeAndApp(
  alertTypeOrOpts: AlertType | FirebaseAlertOptions
): [options.EventHandlerOptions, string, string | undefined] {
  let opts: options.EventHandlerOptions;
  let alertType: AlertType;
  let appId: string | undefined;
  if (typeof alertTypeOrOpts === 'string') {
    alertType = alertTypeOrOpts;
    opts = {};
  } else {
    alertType = alertTypeOrOpts.alertType;
    appId = alertTypeOrOpts.appId;
    opts = { ...alertTypeOrOpts };
    delete (opts as any).alertType;
    delete (opts as any).appId;
  }
  return [opts, alertType, appId];
}
