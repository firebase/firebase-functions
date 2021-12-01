import * as options from '../../options';
import { CloudEvent, CloudFunction } from '../../core';

// data of the CloudEvent
export interface FirebaseAlertData<T = any> {
  createTime: string;
  endTime: string;
  payload: T;
}

export type AlertType =
  | 'crashlytics.newFatalIssue'
  | 'crashlytics.newNonfatalIssue'
  | 'crashlytics.regressionAlert'
  | 'crashlytics.stabilityDigest'
  | 'crashlytics.velocityAlert'
  | 'crashlytics.newAnrIssue'
  | 'billing.planUpdate'
  | 'billing.automatedPlanUpdate'
  | 'appDistribution.newTesterIosDevice'
  | string; // for forward and backward compatibility

/** Options */
export interface FirebaseAlertOptions extends options.EventHandlerOptions {
  alertType: AlertType; // required
  appId?: string; // optional
}

// CloudEvent with two custom attributes
export interface WithAlertTypeAndApp {
  alertType: string;
  appId?: string; // optional in the payload
}

/** @internal */
export const eventType = 'firebase.firebasealerts.alerts.v1.published';

/** Handlers */
export function onAlertPublished<T extends { ['@type']: string } = any>(
  alertTypeOrOpts: AlertType | FirebaseAlertOptions,
  handler: (
    event: CloudEvent<FirebaseAlertData<T>, WithAlertTypeAndApp>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<T>> {
  const [opts, alertType, appId] = getOptsAndAlertTypeAndApp(alertTypeOrOpts);

  const func = (raw: CloudEvent<unknown>) => {
    return handler(
      raw as CloudEvent<FirebaseAlertData<T>, WithAlertTypeAndApp>
    );
  };

  func.run = handler;

  // TypeScript doesn't recognize defineProperty as adding a property and complains
  // that __endpoint doesn't exist. We can either cast to any and lose all type safety
  // or we can just assign a meaningless value before calling defineProperty.
  func.__trigger = 'silence the transpiler';
  func.__endpoint = {};
  defineTriggerAndEndpoint(func, opts, alertType, appId);

  return func;
}

/** @internal */
export function defineTriggerAndEndpoint(
  func: any,
  opts: options.EventHandlerOptions,
  alertType: string,
  appId?: string
): any {
  Object.defineProperty(func, '__endpoint', {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(
        options.getGlobalOptions()
      );
      const specificOpts = options.optionsToTriggerAnnotations(opts);

      const endpoint = {
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
            alertType,
          },
          retry: false,
        },
      };
      if (appId) {
        Object.defineProperty(
          endpoint.eventTrigger.eventFilters,
          'appId',
          appId
        );
      }
      return endpoint;
    },
  });

  return func;
}

/** @internal */
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
