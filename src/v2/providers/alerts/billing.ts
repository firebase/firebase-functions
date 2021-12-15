import * as options from '../../options';
import { FirebaseAlertData, defineEndpoint } from '.';
import { CloudEvent, CloudFunction } from '../../core';

/** Data */
// billing.planUpdate
export interface PlanUpdatePayload {
  ['@type']: 'com.google.firebase.firebasealerts.PlanUpdatePayload';
  billingPlan: string;
  principalEmail: string;
}
// billing.automatedPlanUpdate
export interface PlanAutomatedUpdatePayload {
  ['@type']: 'com.google.firebase.firebasealerts.PlanAutomatedUpdatePayload';
  billingPlan: string;
}

/** Events */
/** @internal */
export const planUpdateAlert = 'billing.planUpdate';
/** @internal */
export const automatedPlanUpdateAlert = 'billing.automatedPlanUpdate';

/** Cloud Event Type */
interface WithAlertType {
  alertType: string;
}
export type BillingEvent<T> = CloudEvent<FirebaseAlertData<T>, WithAlertType>;

/** Handlers */
export function onPlanUpdatePublished(
  handler: (event: BillingEvent<PlanUpdatePayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<PlanUpdatePayload>>;
export function onPlanUpdatePublished(
  opts: options.EventHandlerOptions,
  handler: (event: BillingEvent<PlanUpdatePayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<PlanUpdatePayload>>;
export function onPlanUpdatePublished(
  optsOrHandler:
    | options.EventHandlerOptions
    | ((event: BillingEvent<PlanUpdatePayload>) => any | Promise<any>),
  handler?: (event: BillingEvent<PlanUpdatePayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<PlanUpdatePayload>> {
  return onOperation<PlanUpdatePayload>(
    planUpdateAlert,
    optsOrHandler,
    handler
  );
}

export function onAutomatedPlanUpdatePublished(
  handler: (
    event: BillingEvent<PlanAutomatedUpdatePayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<PlanAutomatedUpdatePayload>>;
export function onAutomatedPlanUpdatePublished(
  opts: options.EventHandlerOptions,
  handler: (
    event: BillingEvent<PlanAutomatedUpdatePayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<PlanAutomatedUpdatePayload>>;
export function onAutomatedPlanUpdatePublished(
  optsOrHandler:
    | options.EventHandlerOptions
    | ((event: BillingEvent<PlanAutomatedUpdatePayload>) => any | Promise<any>),
  handler?: (
    event: BillingEvent<PlanAutomatedUpdatePayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<PlanAutomatedUpdatePayload>> {
  return onOperation<PlanAutomatedUpdatePayload>(
    automatedPlanUpdateAlert,
    optsOrHandler,
    handler
  );
}

/** @internal */
export function onOperation<T>(
  alertType: string,
  optsOrHandler:
    | options.EventHandlerOptions
    | ((event: BillingEvent<T>) => any | Promise<any>),
  handler: (event: BillingEvent<T>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<T>> {
  if (typeof optsOrHandler === 'function') {
    handler = optsOrHandler as (event: BillingEvent<T>) => any | Promise<any>;
    optsOrHandler = {};
  }

  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as BillingEvent<T>);
  };

  func.run = handler;

  // TypeScript doesn't recognize defineProperty as adding a property and complains
  // that __endpoint doesn't exist. We can either cast to any and lose all type safety
  // or we can just assign a meaningless value before calling defineProperty.
  func.__trigger = 'silence the transpiler';
  func.__endpoint = {};
  defineEndpoint(func, optsOrHandler, alertType, undefined);

  return func;
}
