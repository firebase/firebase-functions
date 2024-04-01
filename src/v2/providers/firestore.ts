// The MIT License (MIT)
//
// Copyright (c) 2023 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as firestore from "firebase-admin/firestore";
import * as logger from "../../logger";
import { ParamsOf } from "../../common/params";
import { normalizePath } from "../../common/utilities/path";
import { PathPattern } from "../../common/utilities/path-pattern";
import { initV2Endpoint, ManifestEndpoint } from "../../runtime/manifest";
import { Change, CloudEvent, CloudFunction } from "../core";
import { EventHandlerOptions, getGlobalOptions, optionsToEndpoint } from "../options";
import {
  createBeforeSnapshotFromJson,
  createBeforeSnapshotFromProtobuf,
  createSnapshotFromJson,
  createSnapshotFromProtobuf,
} from "../../common/providers/firestore";
import { wrapTraceContext } from "../trace";
import { withInit } from "../../common/onInit";
import { Expression } from "../../params";

export { Change };

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
  authtype?: string;
  authid?: string;
}

/** A Firestore DocumentSnapshot */
export type DocumentSnapshot = firestore.DocumentSnapshot;

/** A Firestore QueryDocumentSnapshot */
export type QueryDocumentSnapshot = firestore.QueryDocumentSnapshot;

type AuthType = "service_account" | "api_key" | "system" | "unauthenticated" | "unknown";

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
  /** The type of principal that triggered the event */
  authType?: AuthType;
  /** The unique identifier for the principal */
  authId?: string;
  /**
   * An object containing the values of the path patterns.
   * Only named capture groups will be populated - {key}, {key=*}, {key=**}
   */
  params: Params;
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

/**
 * Event handler which triggers when a document is created, updated, or deleted in Firestore.
 *
 * @param document - The Firestore document path to trigger on.
 * @param handler - Event handler which is run every time a Firestore create, update, or delete occurs.
 */
export function onDocumentWritten<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is created, updated, or deleted in Firestore.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firestore create, update, or delete occurs.
 */
export function onDocumentWritten<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is created, updated, or deleted in Firestore.
 *
 * @param documentOrOpts - Options or a string document path.
 * @param handler - Event handler which is run every time a Firestore create, update, or delete occurs.
 */
export function onDocumentWritten<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>> {
  return onChangedOperation(writtenEventType, documentOrOpts, handler);
}

/**
 * Event handler which triggers when a document is created, updated, or deleted in Firestore.
 * This trigger will also provide the authentication context of the principal who triggered the event.
 *
 * @param document - The Firestore document path to trigger on.
 * @param handler - Event handler which is run every time a Firestore create, update, or delete occurs.
 */
export function onDocumentWrittenWithAuthContext<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is created, updated, or deleted in Firestore.
 * This trigger will also provide the authentication context of the principal who triggered the event.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firestore create, update, or delete occurs.
 */
export function onDocumentWrittenWithAuthContext<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is created, updated, or deleted in Firestore.
 * This trigger will also provide the authentication context of the principal who triggered the event.
 *
 * @param opts - Options or a string document path.
 * @param handler - Event handler which is run every time a Firestore create, update, or delete occurs.
 */
export function onDocumentWrittenWithAuthContext<Document extends string>(
  documentorOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<DocumentSnapshot> | undefined, ParamsOf<Document>>> {
  return onChangedOperation(writtenEventWithAuthContextType, documentorOpts, handler);
}

/**
 * Event handler which triggers when a document is created in Firestore.
 *
 * @param document - The Firestore document path to trigger on.
 * @param handler - Event handler which is run every time a Firestore create occurs.
 */
export function onDocumentCreated<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is created in Firestore.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firestore create occurs.
 */
export function onDocumentCreated<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is created in Firestore.
 *
 * @param documentOrOpts - Options or a string document path.
 * @param handler - Event handler which is run every time a Firestore create occurs.
 */
export function onDocumentCreated<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>> {
  return onOperation(createdEventType, documentOrOpts, handler);
}

/**
 * Event handler which triggers when a document is created in Firestore.
 * This trigger will also provide the authentication context of the principal who triggered the event.
 *
 * @param document - The Firestore document path to trigger on.
 * @param handler - Event handler which is run every time a Firestore create occurs.
 */
export function onDocumentCreatedWithAuthContext<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is created in Firestore.
 * This trigger will also provide the authentication context of the principal who triggered the event.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firestore create occurs.
 */
export function onDocumentCreatedWithAuthContext<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is created in Firestore.
 *
 * @param documentOrOpts - Options or a string document path.
 * @param handler - Event handler which is run every time a Firestore create occurs.
 */
export function onDocumentCreatedWithAuthContext<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>> {
  return onOperation(createdEventWithAuthContextType, documentOrOpts, handler);
}

/**
 * Event handler which triggers when a document is updated in Firestore.
 *
 * @param document - The Firestore document path to trigger on.
 * @param handler - Event handler which is run every time a Firestore update occurs.
 */
export function onDocumentUpdated<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>>;
/**
 * Event handler which triggers when a document is updated in Firestore.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firestore update occurs.
 */
export function onDocumentUpdated<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is updated in Firestore.
 *
 * @param documentOrOpts - Options or a string document path.
 * @param handler - Event handler which is run every time a Firestore update occurs.
 */
export function onDocumentUpdated<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>> {
  return onChangedOperation(updatedEventType, documentOrOpts, handler);
}

/**
 * Event handler which triggers when a document is updated in Firestore.
 * This trigger will also provide the authentication context of the principal who triggered the event.
 *
 * @param document - The Firestore document path to trigger on.
 * @param handler - Event handler which is run every time a Firestore update occurs.
 */
export function onDocumentUpdatedWithAuthContext<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>>;
/**
 * Event handler which triggers when a document is updated in Firestore.
 * This trigger will also provide the authentication context of the principal who triggered the event.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firestore update occurs.
 */
export function onDocumentUpdatedWithAuthContext<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is updated in Firestore.
 *
 * @param documentOrOpts - Options or a string document path.
 * @param handler - Event handler which is run every time a Firestore update occurs.
 */
export function onDocumentUpdatedWithAuthContext<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, ParamsOf<Document>>> {
  return onChangedOperation(updatedEventWithAuthContextType, documentOrOpts, handler);
}

/**
 * Event handler which triggers when a document is deleted in Firestore.
 *
 * @param document - The Firestore document path to trigger on.
 * @param handler - Event handler which is run every time a Firestore delete occurs.
 */
export function onDocumentDeleted<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is deleted in Firestore.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firestore delete occurs.
 */
export function onDocumentDeleted<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is deleted in Firestore.
 *
 * @param documentOrOpts - Options or a string document path.
 * @param handler - Event handler which is run every time a Firestore delete occurs.
 */
export function onDocumentDeleted<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>> {
  return onOperation(deletedEventType, documentOrOpts, handler);
}

/**
 * Event handler which triggers when a document is deleted in Firestore.
 * This trigger will also provide the authentication context of the principal who triggered the event.
 *
 * @param document - The Firestore document path to trigger on.
 * @param handler - Event handler which is run every time a Firestore delete occurs.
 */
export function onDocumentDeletedWithAuthContext<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is deleted in Firestore.
 * This trigger will also provide the authentication context of the principal who triggered the event.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firestore delete occurs.
 */
export function onDocumentDeletedWithAuthContext<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;

/**
 * Event handler which triggers when a document is deleted in Firestore.
 *
 * @param documentOrOpts - Options or a string document path.
 * @param handler - Event handler which is run every time a Firestore delete occurs.
 */
export function onDocumentDeletedWithAuthContext<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>> {
  return onOperation(deletedEventWithAuthContextType, documentOrOpts, handler);
}

/** @internal */
export function getOpts(documentOrOpts: string | DocumentOptions) {
  let document: string | Expression<string>;
  let database: string | Expression<string>;
  let namespace: string | Expression<string>;
  let opts: EventHandlerOptions;
  if (typeof documentOrOpts === "string") {
    document = normalizePath(documentOrOpts);
    database = "(default)";
    namespace = "(default)";
    opts = {};
  } else {
    document =
      typeof documentOrOpts.document === "string"
        ? normalizePath(documentOrOpts.document)
        : documentOrOpts.document;
    database = documentOrOpts.database || "(default)";
    namespace = documentOrOpts.namespace || "(default)";
    opts = { ...documentOrOpts };
    delete (opts as any).document;
    delete (opts as any).database;
    delete (opts as any).namespace;
  }

  return {
    document,
    database,
    namespace,
    opts,
  };
}

/** @hidden */
function getPath(event: RawFirestoreEvent): string {
  return `projects/${event.project}/databases/${event.database}/documents/${event.document}`;
}

/** @internal */
export function createSnapshot(event: RawFirestoreEvent): QueryDocumentSnapshot {
  if (event.datacontenttype?.includes("application/protobuf") || Buffer.isBuffer(event.data)) {
    return createSnapshotFromProtobuf(event.data as Uint8Array, getPath(event));
  } else if (event.datacontenttype?.includes("application/json")) {
    return createSnapshotFromJson(
      event.data,
      event.source,
      (event.data as RawFirestoreData).value?.createTime,
      (event.data as RawFirestoreData).value?.updateTime
    );
  } else {
    logger.error(
      `Cannot determine payload type, datacontenttype is ${event.datacontenttype}, failing out.`
    );
    throw Error("Error: Cannot parse event payload.");
  }
}

/** @internal */
export function createBeforeSnapshot(event: RawFirestoreEvent): QueryDocumentSnapshot {
  if (event.datacontenttype?.includes("application/protobuf") || Buffer.isBuffer(event.data)) {
    return createBeforeSnapshotFromProtobuf(event.data as Uint8Array, getPath(event));
  } else if (event.datacontenttype?.includes("application/json")) {
    return createBeforeSnapshotFromJson(
      event.data,
      event.source,
      (event.data as RawFirestoreData).oldValue?.createTime,
      (event.data as RawFirestoreData).oldValue?.updateTime
    );
  } else {
    logger.error(
      `Cannot determine payload type, datacontenttype is ${event.datacontenttype}, failing out.`
    );
    throw Error("Error: Cannot parse event payload.");
  }
}

/** @internal */
export function makeParams(document: string, documentPattern: PathPattern) {
  return {
    ...documentPattern.extractMatches(document),
  };
}

/** @internal */
export function makeFirestoreEvent<Params>(
  eventType: string,
  event: RawFirestoreEvent,
  params: Params
): FirestoreEvent<QueryDocumentSnapshot | undefined, Params> {
  const data = event.data
    ? eventType === createdEventType
      ? createSnapshot(event)
      : createBeforeSnapshot(event)
    : undefined;
  const firestoreEvent: FirestoreEvent<QueryDocumentSnapshot | undefined, Params> = {
    ...event,
    params,
    data,
    authType: event.authtype as AuthType,
    authId: event.authid,
  };
  delete (firestoreEvent as any).datacontenttype;
  delete (firestoreEvent as any).dataschema;
  return firestoreEvent;
}

/** @internal */
export function makeChangedFirestoreEvent<Params>(
  event: RawFirestoreEvent,
  params: Params
): FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, Params> {
  const data = event.data
    ? Change.fromObjects(createBeforeSnapshot(event), createSnapshot(event))
    : undefined;
  const firestoreEvent: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, Params> = {
    ...event,
    params,
    data,
    authType: event.authtype as AuthType,
    authId: event.authid,
  };
  delete (firestoreEvent as any).datacontenttype;
  delete (firestoreEvent as any).dataschema;
  return firestoreEvent;
}

/** @internal */
export function makeEndpoint(
  eventType: string,
  opts: EventHandlerOptions,
  document: string | Expression<string>,
  database: string | Expression<string>,
  namespace: string | Expression<string>
): ManifestEndpoint {
  const baseOpts = optionsToEndpoint(getGlobalOptions());
  const specificOpts = optionsToEndpoint(opts);

  const eventFilters: Record<string, string | Expression<string>> = {
    database,
    namespace,
  };
  const eventFilterPathPatterns: Record<string, string | Expression<string>> = {};
  const maybePattern =
    typeof document === "string" ? new PathPattern(document).hasWildcards() : true;
  if (maybePattern) {
    eventFilterPathPatterns.document = document;
  } else {
    eventFilters.document = document;
  }

  return {
    ...initV2Endpoint(getGlobalOptions(), opts),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType,
      eventFilters,
      eventFilterPathPatterns,
      retry: !!opts.retry,
    },
  };
}

/** @internal */
export function onOperation<Document extends string>(
  eventType: string,
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (event: FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>> {
  const { document, database, namespace, opts } = getOpts(documentOrOpts);

  // wrap the handler
  const func = (raw: CloudEvent<unknown>) => {
    const event = raw as RawFirestoreEvent;
    const documentPattern = new PathPattern(
      typeof document === "string" ? document : document.value()
    );
    const params = makeParams(event.document, documentPattern) as unknown as ParamsOf<Document>;
    const firestoreEvent = makeFirestoreEvent(eventType, event, params);
    return wrapTraceContext(withInit(handler))(firestoreEvent);
  };

  func.run = handler;

  func.__endpoint = makeEndpoint(eventType, opts, document, database, namespace);

  return func;
}

/** @internal */
export function onChangedOperation<Document extends string>(
  eventType: string,
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<QueryDocumentSnapshot>, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot>, ParamsOf<Document>>> {
  const { document, database, namespace, opts } = getOpts(documentOrOpts);

  // wrap the handler
  const func = (raw: CloudEvent<unknown>) => {
    const event = raw as RawFirestoreEvent;
    const documentPattern = new PathPattern(
      typeof document === "string" ? document : document.value()
    );
    const params = makeParams(event.document, documentPattern) as unknown as ParamsOf<Document>;
    const firestoreEvent = makeChangedFirestoreEvent(event, params);
    return wrapTraceContext(withInit(handler))(firestoreEvent);
  };

  func.run = handler;

  func.__endpoint = makeEndpoint(eventType, opts, document, database, namespace);

  return func;
}
