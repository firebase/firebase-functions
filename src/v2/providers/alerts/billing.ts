import { getEndpointAnnotation, FirebaseAlertData } from '.';
import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';

/**
 * The internal payload object for billing plan updates.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface PlanUpdatePayload {
  ['@type']: 'com.google.firebase.firebasealerts.PlanUpdatePayload';
  billingPlan: string;
  principalEmail: string;
}

/**
 * The internal payload object for billing plan automated updates.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface PlanAutomatedUpdatePayload {
  ['@type']: 'com.google.firebase.firebasealerts.PlanAutomatedUpdatePayload';
  billingPlan: string;
}

interface WithAlertType {
  alertType: string;
}
/**
 * A custom CloudEvent for billing Firebase Alerts (with custom extension attributes).
 */
export type BillingEvent<T> = CloudEvent<FirebaseAlertData<T>, WithAlertType>;

/** @internal */
export const planUpdateAlert = 'billing.planUpdate';
/** @internal */
export const automatedPlanUpdateAlert = 'billing.automatedPlanUpdate';

/** @internal */
type BillingEventHandler<T> = (event: BillingEvent<T>) => any | Promise<any>;

/** Handlers */
/** Handle a plan update published */
export function onPlanUpdatePublished(
  handler: BillingEventHandler<PlanUpdatePayload>
): CloudFunction<FirebaseAlertData<PlanUpdatePayload>>;
export function onPlanUpdatePublished(
  opts: options.EventHandlerOptions,
  handler: BillingEventHandler<PlanUpdatePayload>
): CloudFunction<FirebaseAlertData<PlanUpdatePayload>>;
export function onPlanUpdatePublished(
  optsOrHandler:
    | options.EventHandlerOptions
    | BillingEventHandler<PlanUpdatePayload>,
  handler?: BillingEventHandler<PlanUpdatePayload>
): CloudFunction<FirebaseAlertData<PlanUpdatePayload>> {
  return onOperation<PlanUpdatePayload>(
    planUpdateAlert,
    optsOrHandler,
    handler
  );
}

/** Handle an automated plan update published */
export function onAutomatedPlanUpdatePublished(
  handler: BillingEventHandler<PlanAutomatedUpdatePayload>
): CloudFunction<FirebaseAlertData<PlanAutomatedUpdatePayload>>;
export function onAutomatedPlanUpdatePublished(
  opts: options.EventHandlerOptions,
  handler: BillingEventHandler<PlanAutomatedUpdatePayload>
): CloudFunction<FirebaseAlertData<PlanAutomatedUpdatePayload>>;
export function onAutomatedPlanUpdatePublished(
  optsOrHandler:
    | options.EventHandlerOptions
    | BillingEventHandler<PlanAutomatedUpdatePayload>,
  handler?: BillingEventHandler<PlanAutomatedUpdatePayload>
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
  func.__endpoint = getEndpointAnnotation(optsOrHandler, alertType);

  return func;
}
