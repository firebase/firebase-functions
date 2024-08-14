/**
 * Translate Text in Firestore SDK for firestore-translate-text@0.1.18
 *
 * When filing bugs or feature requests please specify:
 *   "Extensions SDK v1.0.0 for firestore-translate-text@0.1.18"
 * https://github.com/firebase/firebase-tools/issues/new/choose
 *
 * GENERATED FILE. DO NOT EDIT.
 */
import { CloudEvent } from "../../../../v2";
import { EventarcTriggerOptions } from "../../../../v2/eventarc";
export type EventCallback<T> = (event: CloudEvent<T>) => unknown | Promise<unknown>;
export type SimpleEventarcTriggerOptions = Omit<
  EventarcTriggerOptions,
  "eventType" | "channel" | "region"
>;
export type EventArcRegionType = "us-central1" | "us-west1" | "europe-west4" | "asia-northeast1";
export type SystemFunctionVpcConnectorEgressSettingsParam =
  | "VPC_CONNECTOR_EGRESS_SETTINGS_UNSPECIFIED"
  | "PRIVATE_RANGES_ONLY"
  | "ALL_TRAFFIC";
export type SystemFunctionIngressSettingsParam =
  | "ALLOW_ALL"
  | "ALLOW_INTERNAL_ONLY"
  | "ALLOW_INTERNAL_AND_GCLB";
export type SystemFunctionLocationParam =
  | "us-central1"
  | "us-east1"
  | "us-east4"
  | "us-west1"
  | "us-west2"
  | "us-west3"
  | "us-west4"
  | "europe-central2"
  | "europe-west1"
  | "europe-west2"
  | "europe-west3"
  | "europe-west6"
  | "asia-east1"
  | "asia-east2"
  | "asia-northeast1"
  | "asia-northeast2"
  | "asia-northeast3"
  | "asia-south1"
  | "asia-southeast1"
  | "asia-southeast2"
  | "northamerica-northeast1"
  | "southamerica-east1"
  | "australia-southeast1";
export type SystemFunctionMemoryParam = "128" | "256" | "512" | "1024" | "2048" | "4096" | "8192";
/**
 * Parameters for firestore-translate-text@0.1.18 extension
 */
export interface FirestoreTranslateTextParams {
  /**
   * Target languages for translations, as a comma-separated list
   */
  LANGUAGES: string;
  /**
   * Collection path
   */
  COLLECTION_PATH: string;
  /**
   * Input field name
   */
  INPUT_FIELD_NAME: string;
  /**
   * Translations output field name
   */
  OUTPUT_FIELD_NAME: string;
  /**
   * Languages field name
   */
  LANGUAGES_FIELD_NAME?: string;
  /**
   * Event Arc Region
   */
  _EVENT_ARC_REGION?: EventArcRegionType;
  /**
   * Function timeout seconds
   */
  _FUNCTION_TIMEOUT_SECONDS?: string;
  /**
   * VPC Connector
   */
  _FUNCTION_VPC_CONNECTOR?: string;
  /**
   * VPC Connector Egress settings
   */
  _FUNCTION_VPC_CONNECTOR_EGRESS_SETTINGS?: SystemFunctionVpcConnectorEgressSettingsParam;
  /**
   * Minimum function instances
   */
  _FUNCTION_MIN_INSTANCES?: string;
  /**
   * Maximum function instances
   */
  _FUNCTION_MAX_INSTANCES?: string;
  /**
   * Function ingress settings
   */
  _FUNCTION_INGRESS_SETTINGS?: SystemFunctionIngressSettingsParam;
  /**
   * Function labels
   */
  _FUNCTION_LABELS?: string;
  /**
   * KMS key name
   */
  _FUNCTION_KMS_KEY_NAME?: string;
  /**
   * Docker repository
   */
  _FUNCTION_DOCKER_REPOSITORY?: string;
  /**
   * Cloud Functions location
   */
  _FUNCTION_LOCATION: SystemFunctionLocationParam;
  /**
   * Function memory
   */
  _FUNCTION_MEMORY?: SystemFunctionMemoryParam;
}
export declare function firestoreTranslateText(
  instanceId: string,
  params: FirestoreTranslateTextParams
): FirestoreTranslateText;
/**
 * Translate Text in Firestore
 * Translates strings written to a Cloud Firestore collection into multiple languages (uses Cloud Translation API).
 */
export declare class FirestoreTranslateText {
  private instanceId;
  private params;
  events: string[];
  readonly FIREBASE_EXTENSION_REFERENCE = "firebase/firestore-translate-text@0.1.18";
  readonly EXTENSION_VERSION = "0.1.18";
  constructor(instanceId: string, params: FirestoreTranslateTextParams);
  getInstanceId(): string;
  getParams(): FirestoreTranslateTextParams;
  /**
   * Occurs when a trigger has been called within the Extension, and will include data such as the context of the trigger request.
   */
  onStart<T = unknown>(
    callback: EventCallback<T>,
    options?: SimpleEventarcTriggerOptions
  ): import("firebase-functions/v2").CloudFunction<CloudEvent<T>>;
  /**
   * Occurs when image resizing completes successfully. The event will contain further details about specific formats and sizes.
   */
  onSuccess<T = unknown>(
    callback: EventCallback<T>,
    options?: SimpleEventarcTriggerOptions
  ): import("firebase-functions/v2").CloudFunction<CloudEvent<T>>;
  /**
   * Occurs when an issue has been experienced in the Extension. This will include any error data that has been included within the Error Exception.
   */
  onError<T = unknown>(
    callback: EventCallback<T>,
    options?: SimpleEventarcTriggerOptions
  ): import("firebase-functions/v2").CloudFunction<CloudEvent<T>>;
  /**
   * Occurs when the function is settled. Provides no customized data other than the context.
   */
  onCompletion<T = unknown>(
    callback: EventCallback<T>,
    options?: SimpleEventarcTriggerOptions
  ): import("firebase-functions/v2").CloudFunction<CloudEvent<T>>;
}
