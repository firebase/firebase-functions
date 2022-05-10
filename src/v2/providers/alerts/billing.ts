import { FirebaseAlertData, getEndpointAnnotation } from '.';
import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';

/**
 * The internal payload object for billing plan updates.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface PlanUpdatePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.BillingPlanUpdatePayload';
  /** A Firebase billing plan. */
  billingPlan: string;
  /** The email address of the person that triggered billing plan change */
  principalEmail: string;
  /** The type of the notification, e.g. upgrade, downgrade */
  notificationType: string;
}

/**
 * The internal payload object for billing plan automated updates.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface PlanAutomatedUpdatePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.BillingPlanAutomatedUpdatePayload';
  /** A Firebase billing plan. */
  billingPlan: string;
  /** The type of the notification, e.g. upgrade, downgrade */
  notificationType: string;
}

/**
 * A custom CloudEvent for billing Firebase Alerts (with custom extension attributes).
 * @typeParam T - the data type for billing alerts that is wrapped in a FirebaseAlertData object.
 */
export interface BillingEvent<T> extends CloudEvent<FirebaseAlertData<T>> {
  /** The type of the alerts that got triggered. */
  alertType: string;
}

/** @internal */
export const planUpdateAlert = 'billing.planUpdate';
/** @internal */
export const planAutomatedUpdateAlert = 'billing.planAutomatedUpdate';

/**
 * Declares a function that can handle a billing plan update event.
 * @param handler - Event handler which is run every time a billing plan is updated.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onPlanUpdatePublished(
  handler: (event: BillingEvent<PlanUpdatePayload>) => any | Promise<any>
): CloudFunction<BillingEvent<PlanUpdatePayload>>;

/**
 * Declares a function that can handle a billing plan update event.
 * @param opts - Options that can be set on the Cloud Function.
 * @param handler - Event handler which is run every time a billing plan is updated.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onPlanUpdatePublished(
  opts: options.EventHandlerOptions,
  handler: (event: BillingEvent<PlanUpdatePayload>) => any | Promise<any>
): CloudFunction<BillingEvent<PlanUpdatePayload>>;

/**
 * Declares a function that can handle a billing plan update event.
 * @param optsOrHandler - Options or an event-handling function.
 * @param handler - Event handler which is run every time a billing plan is updated.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onPlanUpdatePublished(
  optsOrHandler:
    | options.EventHandlerOptions
    | ((event: BillingEvent<PlanUpdatePayload>) => any | Promise<any>),
  handler?: (event: BillingEvent<PlanUpdatePayload>) => any | Promise<any>
): CloudFunction<BillingEvent<PlanUpdatePayload>> {
  return onOperation<PlanUpdatePayload>(
    planUpdateAlert,
    optsOrHandler,
    handler
  );
}

/**
 * Declares a function that can handle an automated billing plan update event.
 * @param handler - Event handler which is run every time an automated billing plan update occurs.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onPlanAutomatedUpdatePublished(
  handler: (
    event: BillingEvent<PlanAutomatedUpdatePayload>
  ) => any | Promise<any>
): CloudFunction<BillingEvent<PlanAutomatedUpdatePayload>>;

/**
 * Declares a function that can handle an automated billing plan update event.
 * @param opts - Options that can be set on the Cloud Function.
 * @param handler - Event handler which is run every time an automated billing plan update occurs.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onPlanAutomatedUpdatePublished(
  opts: options.EventHandlerOptions,
  handler: (
    event: BillingEvent<PlanAutomatedUpdatePayload>
  ) => any | Promise<any>
): CloudFunction<BillingEvent<PlanAutomatedUpdatePayload>>;

/**
 * Declares a function that can handle an automated billing plan update event.
 * @param optsOrHandler - Options or an event-handling function.
 * @param handler - Event handler which is run every time an automated billing plan update occurs.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onPlanAutomatedUpdatePublished(
  optsOrHandler:
    | options.EventHandlerOptions
    | ((event: BillingEvent<PlanAutomatedUpdatePayload>) => any | Promise<any>),
  handler?: (
    event: BillingEvent<PlanAutomatedUpdatePayload>
  ) => any | Promise<any>
): CloudFunction<BillingEvent<PlanAutomatedUpdatePayload>> {
  return onOperation<PlanAutomatedUpdatePayload>(
    planAutomatedUpdateAlert,
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
): CloudFunction<BillingEvent<T>> {
  if (typeof optsOrHandler === 'function') {
    handler = optsOrHandler as (event: BillingEvent<T>) => any | Promise<any>;
    optsOrHandler = {};
  }

  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as BillingEvent<T>);
  };

  func.run = handler;
  func.__endpoint = getEndpointAnnotation(optsOrHandler, alertType);

  return func;
}
