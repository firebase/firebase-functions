import { ParamsOf } from "../../../common/params";
import { Change, CloudFunction } from "../../core";
import { onChangedOperation, onOperation } from "./helpers";
import {
  createdEventType,
  createdEventWithAuthContextType,
  DocumentOptions,
  deletedEventType,
  deletedEventWithAuthContextType,
  FirestoreAuthEvent,
  FirestoreEvent,
  QueryDocumentSnapshot,
  updatedEventType,
  updatedEventWithAuthContextType,
  writtenEventType,
  writtenEventWithAuthContextType,
} from "./types";

export function onDocumentWritten<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;
export function onDocumentWritten<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;
export function onDocumentWritten<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>> {
  return onOperation(writtenEventType, documentOrOpts, handler);
}

export function onDocumentWrittenWithAuthContext<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;
export function onDocumentWrittenWithAuthContext<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;
export function onDocumentWrittenWithAuthContext<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>> {
  return onOperation(writtenEventWithAuthContextType, documentOrOpts, handler);
}

export function onDocumentCreated<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;
export function onDocumentCreated<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;
export function onDocumentCreated<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>> {
  return onOperation(createdEventType, documentOrOpts, handler);
}

export function onDocumentCreatedWithAuthContext<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;
export function onDocumentCreatedWithAuthContext<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>>;
export function onDocumentCreatedWithAuthContext<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<QueryDocumentSnapshot | undefined, ParamsOf<Document>>> {
  return onOperation(createdEventWithAuthContextType, documentOrOpts, handler);
}

export function onDocumentUpdated<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>>;
export function onDocumentUpdated<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>>;
export function onDocumentUpdated<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>> {
  return onChangedOperation(updatedEventType, documentOrOpts, handler);
}

export function onDocumentUpdatedWithAuthContext<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>>;
export function onDocumentUpdatedWithAuthContext<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>>;
export function onDocumentUpdatedWithAuthContext<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>> {
  return onChangedOperation(updatedEventWithAuthContextType, documentOrOpts, handler);
}

export function onDocumentDeleted<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>>;
export function onDocumentDeleted<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>>;
export function onDocumentDeleted<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<any> | undefined, ParamsOf<Document>>> {
  return onChangedOperation(deletedEventType, documentOrOpts, handler);
}

export function onDocumentDeletedWithAuthContext<Document extends string>(
  document: Document,
  handler: (
    event: FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>>;
export function onDocumentDeletedWithAuthContext<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (
    event: FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>>;
export function onDocumentDeletedWithAuthContext<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (
    event: FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>
  ) => any | Promise<any>
): CloudFunction<FirestoreAuthEvent<Change<any> | undefined, ParamsOf<Document>>> {
  return onChangedOperation(deletedEventWithAuthContextType, documentOrOpts, handler);
}
