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
import * as protobuf from "protobufjs";

import { ParamsOf } from "../../common/params";
import { Change, CloudEvent, CloudFunction } from "../core";
import { EventHandlerOptions } from "../options";

const root = protobuf.loadSync(["../../proto/any.proto", "../../firestore.proto"]);

const eventData = "google.events.cloud.firestore.v1.DocumentEventData";


interface RawFirestoreEvent extends CloudEvent<unknown> {
  location: string;
  project: string;
  database: string;
  namespace: string;
  document: string;
}


export type DocumentSnapshot = firestore.DocumentSnapshot;
export type QueryDocumentSnapshot = firestore.QueryDocumentSnapshot;

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

export interface DocumentOptions<Document extends string = string> extends EventHandlerOptions {
  /** The document path */
  document: Document;
  /** The Firestore database */
  database?: string;
  /** The Firestore namespace */
  namespace?: string;
}

/** onDocumentWritten */
export function onDocumentWritten<Document extends string>(
  document: Document,
  handler: (event: FirestoreEvent<Change<DocumentSnapshot>, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<DocumentSnapshot>, ParamsOf<Document>>>;

export function onDocumentWritten<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (event: FirestoreEvent<Change<DocumentSnapshot>, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<DocumentSnapshot>, ParamsOf<Document>>>;

export function onDocumentWritten<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (event: FirestoreEvent<Change<DocumentSnapshot>, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<DocumentSnapshot>, ParamsOf<Document>>> {
  

  return {} as any;
}

/** onDocumentCreated */
export function onDocumentCreated<Document extends string>(
  document: Document,
  handler: (event: FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>>;

export function onDocumentCreated<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (event: FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>>;

export function onDocumentCreated<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (event: FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>> {

  return {} as any;
}

/** onDocumentUpdated */
export function onDocumentUpdated<Document extends string>(
  document: Document,
  handler: (event: FirestoreEvent<Change<QueryDocumentSnapshot>, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot>, ParamsOf<Document>>>;

export function onDocumentUpdated<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (event: FirestoreEvent<Change<QueryDocumentSnapshot>, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot>, ParamsOf<Document>>>;

export function onDocumentUpdated<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (event: FirestoreEvent<Change<QueryDocumentSnapshot>, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<Change<QueryDocumentSnapshot>, ParamsOf<Document>>> {

  return {} as any;
}

/** onDocumentDeleted */
export function onDocumentDeleted<Document extends string>(
  document: Document,
  handler: (event: FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>>;

export function onDocumentDeleted<Document extends string>(
  opts: DocumentOptions<Document>,
  handler: (event: FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>>;

export function onDocumentDeleted<Document extends string>(
  documentOrOpts: Document | DocumentOptions<Document>,
  handler: (event: FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>) => any | Promise<any>
): CloudFunction<FirestoreEvent<QueryDocumentSnapshot, ParamsOf<Document>>> {

  return {} as any;
}

function onOperation() {
  const Any = root.lookupType('google.protobuf.Any');
  const DocumentEventData = root.lookupType('google.events.cloud.firestore.v1.DocumentEventData');


  // wrap the handler
  const func = (raw: CloudEvent<unknown>) => {
    const event = raw as RawFirestoreEvent;
    const dataBuffer = Buffer.from(event.data as any);
    const anyReceived = Any.decode(dataBuffer);
    const firestoreReceived = DocumentEventData.decode(anyReceived.value);

    const documentSnapshot = firestore.snapshot_(firestoreReceived.value, firestoreReceived.value.createTime, 'protobufJS');



    // const instanceUrl = getInstance(event);
    // const params = makeParams(event, pathPattern, instancePattern) as unknown as ParamsOf<Ref>;
    // const data = eventType === deletedEventType ? event.data.data : event.data.delta;
    const databaseEvent = makeDatabaseEvent(event, data, instanceUrl, params);
    return handler(databaseEvent);
  };
}