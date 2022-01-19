// import * as options from '../../options';
// import { CloudEvent, CloudFunction } from '../../core';
// import { ManifestEndpoint } from '../../../common/manifest';

// import * as alerts from './alerts';
// export { alerts };

import * as appDistribution from './appDistribution';
import * as billing from './billing';
import * as crashlytics from './crashlytics';

export {
  appDistribution,
  billing,
  crashlytics
};

export * from './alerts';




// // data of the CloudEvent
// export interface FirebaseAlertData<T = any> {
//   createTime: string;
//   endTime: string;
//   payload: T;
// }

// export type AlertType =
//   | 'crashlytics.newFatalIssue'
//   | 'crashlytics.newNonfatalIssue'
//   | 'crashlytics.regression'
//   | 'crashlytics.stabilityDigest'
//   | 'crashlytics.velocity'
//   | 'crashlytics.newAnrIssue'
//   | 'billing.planUpdate'
//   | 'billing.automatedPlanUpdate'
//   | 'appDistribution.newTesterIosDevice'
//   | string; // for forward and backward compatibility

// /** Options */
// export interface FirebaseAlertOptions extends options.EventHandlerOptions {
//   alertType: AlertType; // required
//   appId?: string; // optional
// }

// interface WithAlertTypeAndApp {
//   alertType: string;
//   appId?: string; // optional in the payload
// }
// export type AlertEvent<T> = CloudEvent<
//   FirebaseAlertData<T>,
//   WithAlertTypeAndApp
// >;

// /** @internal */
// export const eventType = 'firebase.firebasealerts.alerts.v1.published';

// /** Handlers */
// export function onAlertPublished<T extends { ['@type']: string } = any>(
//   alertTypeOrOpts: AlertType | FirebaseAlertOptions,
//   handler: (event: AlertEvent<T>) => any | Promise<any>
// ): CloudFunction<FirebaseAlertData<T>> {
//   const [opts, alertType, appId] = getOptsAndAlertTypeAndApp(alertTypeOrOpts);

//   const func = (raw: CloudEvent<unknown>) => {
//     return handler(
//       raw as CloudEvent<FirebaseAlertData<T>, WithAlertTypeAndApp>
//     );
//   };

//   func.run = handler;

//   // TypeScript doesn't recognize defineProperty as adding a property and complains
//   // that __endpoint doesn't exist. We can either cast to any and lose all type safety
//   // or we can just assign a meaningless value before calling defineProperty.
//   func.__trigger = 'silence the transpiler';
//   func.__endpoint = {} as ManifestEndpoint;
//   defineEndpoint(func, opts, alertType, appId);

//   return func;
// }

// /** @internal */
// export function defineEndpoint(
//   func: CloudFunction<FirebaseAlertData<any>>,
//   opts: options.EventHandlerOptions,
//   alertType: string,
//   appId?: string
// ): void {
//   Object.defineProperty(func, '__endpoint', {
//     get: () => {
//       const baseOpts = options.optionsToTriggerAnnotations(
//         options.getGlobalOptions()
//       );
//       const specificOpts = options.optionsToTriggerAnnotations(opts);

//       const endpoint: ManifestEndpoint = {
//         platform: 'gcfv2',
//         ...baseOpts,
//         ...specificOpts,
//         labels: {
//           ...baseOpts?.labels,
//           ...specificOpts?.labels,
//         },
//         eventTrigger: {
//           eventType,
//           eventFilters: {
//             alertType,
//           },
//           retry: false,
//         },
//       };
//       if (appId) {
//         endpoint.eventTrigger.eventFilters['appId'] = appId;
//       }
//       return endpoint;
//     },
//   });
// }

// /** @internal */
// export function getOptsAndAlertTypeAndApp(
//   alertTypeOrOpts: AlertType | FirebaseAlertOptions
// ): [options.EventHandlerOptions, string, string | undefined] {
//   let opts: options.EventHandlerOptions;
//   let alertType: AlertType;
//   let appId: string | undefined;
//   if (typeof alertTypeOrOpts === 'string') {
//     alertType = alertTypeOrOpts;
//     opts = {};
//   } else {
//     alertType = alertTypeOrOpts.alertType;
//     appId = alertTypeOrOpts.appId;
//     opts = { ...alertTypeOrOpts };
//     delete (opts as any).alertType;
//     delete (opts as any).appId;
//   }
//   return [opts, alertType, appId];
// }
