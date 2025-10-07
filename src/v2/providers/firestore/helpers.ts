import { withInit } from "../../../common/onInit";
import type { ParamsOf } from "../../../common/params";
import { normalizePath } from "../../../common/utilities/path";
import { PathPattern } from "../../../common/utilities/path-pattern";
import type { Expression } from "../../../params";
import { initV2Endpoint, type ManifestEndpoint } from "../../../runtime/manifest";
import type { Change, CloudEvent, CloudFunction } from "../../core";
import { type EventHandlerOptions, getGlobalOptions, optionsToEndpoint } from "../../options";
import { wrapTraceContext } from "../../trace";
import { createBeforeSnapshot, createChangeSnapshot, createSnapshot } from "./snapshots";
import {
  createdEventType,
  createdEventWithAuthContextType,
  type DocumentOptions,
  type DocumentSnapshot,
  type FirestoreAuthEvent,
  type FirestoreEvent,
  type QueryDocumentSnapshot,
  type RawFirestoreAuthEvent,
  type RawFirestoreEvent,
} from "./types";

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

export function makeParams(document: string, documentPattern: PathPattern) {
  return {
    ...documentPattern.extractMatches(document),
  };
}

export function makeFirestoreEvent<Params>(
  eventType: string,
  event: RawFirestoreEvent | RawFirestoreAuthEvent,
  params: Params
):
  | FirestoreEvent<QueryDocumentSnapshot | undefined, Params>
  | FirestoreAuthEvent<QueryDocumentSnapshot | undefined, Params> {
  const data = event.data
    ? eventType === createdEventType || eventType === createdEventWithAuthContextType
      ? createSnapshot(event)
      : createBeforeSnapshot(event)
    : undefined;
  const firestoreEvent: FirestoreEvent<QueryDocumentSnapshot | undefined, Params> = {
    ...event,
    params,
    data,
  };

  delete (firestoreEvent as any).datacontenttype;
  delete (firestoreEvent as any).dataschema;

  if ("authtype" in event) {
    const eventWithAuth = {
      ...firestoreEvent,
      authType: event.authtype,
      authId: event.authid,
    };
    delete (eventWithAuth as any).authtype;
    delete (eventWithAuth as any).authid;
    return eventWithAuth;
  }

  return firestoreEvent;
}

export function makeChangedFirestoreEvent<Params>(
  event: RawFirestoreEvent | RawFirestoreAuthEvent,
  params: Params
):
  | FirestoreEvent<Change<DocumentSnapshot> | undefined, Params>
  | FirestoreAuthEvent<Change<DocumentSnapshot> | undefined, Params> {
  const data = event.data ? createChangeSnapshot(event) : undefined;
  const firestoreEvent: FirestoreEvent<Change<DocumentSnapshot> | undefined, Params> = {
    ...event,
    params,
    data,
  };
  delete (firestoreEvent as any).datacontenttype;
  delete (firestoreEvent as any).dataschema;

  if ("authtype" in event) {
    const eventWithAuth = {
      ...firestoreEvent,
      authType: event.authtype,
      authId: event.authid,
    };
    delete (eventWithAuth as any).authtype;
    delete (eventWithAuth as any).authid;
    return eventWithAuth;
  }

  return firestoreEvent;
}

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
      retry: opts.retry ?? false,
    },
  };
}

export function onOperation<
  Document extends string,
  Event extends FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>,
>(
  eventType: string,
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (event: Event) => any | Promise<any>
): CloudFunction<Event> {
  const { document, database, namespace, opts } = getOpts(documentOrOpts);

  const func = (raw: CloudEvent<unknown>) => {
    const event = raw as RawFirestoreEvent | RawFirestoreAuthEvent;
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

export function onChangedOperation<
  Document extends string,
  Event extends FirestoreEvent<Change<DocumentSnapshot>, ParamsOf<Document>>,
>(
  eventType: string,
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (event: Event) => any | Promise<any>
): CloudFunction<Event> {
  const { document, database, namespace, opts } = getOpts(documentOrOpts);

  const func = (raw: CloudEvent<unknown>) => {
    const event = raw as RawFirestoreEvent | RawFirestoreAuthEvent;
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
