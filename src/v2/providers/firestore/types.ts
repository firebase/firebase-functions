import type * as firestore from "firebase-admin/firestore";

import type { Expression } from "../../../params";
import type { CloudEvent } from "../../core";
import type { EventHandlerOptions } from "../../options";

/** @internal */
export const writtenEventType = "google.cloud.firestore.document.v1.written";
/** @internal */
export const createdEventType = "google.cloud.firestore.document.v1.created";
/** @internal */
export const updatedEventType = "google.cloud.firestore.document.v1.updated";
/** @internal */
export const deletedEventType = "google.cloud.firestore.document.v1.deleted";
/** @internal */
export const writtenEventWithAuthContextType =
  "google.cloud.firestore.document.v1.written.withAuthContext";
/** @internal */
export const createdEventWithAuthContextType =
  "google.cloud.firestore.document.v1.created.withAuthContext";
/** @internal */
export const updatedEventWithAuthContextType =
  "google.cloud.firestore.document.v1.updated.withAuthContext";
/** @internal */
export const deletedEventWithAuthContextType =
  "google.cloud.firestore.document.v1.deleted.withAuthContext";

// https://github.com/googleapis/google-cloudevents-nodejs/blob/main/cloud/firestore/v1/DocumentEventData.ts
/** @internal */
export interface RawFirestoreDocument {
  name: string;
  fields: Record<string, any>;
  createTime: string;
  updateTime: string;
}

/** @internal */
export interface RawFirestoreData {
  value?: RawFirestoreDocument;
  oldValue?: RawFirestoreDocument;
  updateMask?: { fieldPaths: Array<string> };
}

/** @internal */
export interface RawFirestoreEvent extends CloudEvent<Uint8Array | RawFirestoreData | undefined> {
  location: string;
  project: string;
  database: string;
  namespace: string;
  document: string;
  datacontenttype?: string;
  dataschema: string;
}

/** @internal */
export interface RawFirestoreAuthEvent extends RawFirestoreEvent {
  authtype?: AuthType;
  authid?: string;
}

/** A Firestore DocumentSnapshot */
export type DocumentSnapshot = firestore.DocumentSnapshot;

/** A Firestore QueryDocumentSnapshot */
export type QueryDocumentSnapshot = firestore.QueryDocumentSnapshot;

/**
 * AuthType defines the possible values for the authType field in a Firestore event with auth context.
 * - service_account: a non-user principal used to identify a workload or machine user.
 * - api_key: a non-user client API key.
 * - system: an obscured identity used when Cloud Platform or another system triggered the event.
 * - unauthenticated: an unauthenticated action.
 * - unknown: a general type to capture all other principals not captured in the other auth types.
 */
export type AuthType = "service_account" | "api_key" | "system" | "unauthenticated" | "unknown";

/** A CloudEvent that contains a DocumentSnapshot or a Change<DocumentSnapshot> */
export interface FirestoreEvent<T, Params = Record<string, string>> extends CloudEvent<T> {
  /** The location of the Firestore instance */
  location: string;
  /** The project identifier */
  project: string;
  /** The Firestore database */
  database: string;
  /** The Firestore namespace */
  namespace: string;
  /** The document path */
  document: string;
  /**
   * An object containing the values of the path patterns.
   * Only named capture groups will be populated - {key}, {key=*}, {key=**}
   */
  params: Params;
}

export interface FirestoreAuthEvent<T, Params = Record<string, string>>
  extends FirestoreEvent<T, Params> {
  /** The type of principal that triggered the event */
  authType: AuthType;
  /** The unique identifier for the principal */
  authId?: string;
}

/** DocumentOptions extend EventHandlerOptions with provided document and optional database and namespace.  */
export interface DocumentOptions<Document extends string = string> extends EventHandlerOptions {
  /** The document path */
  document: Document | Expression<string>;
  /** The Firestore database */
  database?: string | Expression<string>;
  /** The Firestore namespace */
  namespace?: string | Expression<string>;
}
