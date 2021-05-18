// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
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

import * as firebase from 'firebase-admin';
import * as _ from 'lodash';
import { posix } from 'path';
import { apps } from '../apps';
import {
  Change,
  CloudFunction,
  Event,
  EventContext,
  makeCloudFunction,
} from '../cloud-functions';
import { DeploymentOptions } from '../function-configuration';
import * as proto from '@google-cloud/firestore/types/protos/firestore_v1_proto_api';

// These types are simple and self-contained, so we can create them directly from their
// inner definitions w/o including the whole world.
import { GeoPoint } from '@google-cloud/firestore/build/src/geo-point';
import { Timestamp } from '@google-cloud/firestore/build/src/timestamp';
import { firestore } from 'firebase-admin';
import { dateToTimestampProto } from '../encoder';

/** @hidden */
export const provider = 'google.firestore';
/** @hidden */
export const service = 'firestore.googleapis.com';
/** @hidden */
export const defaultDatabase = '(default)';
export type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
export type QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;

/**
 * Select the Firestore document to listen to for events.
 * @param path Full database path to listen to. This includes the name of
 * the collection that the document is a part of. For example, if the
 * collection is named "users" and the document is named "Ada", then the
 * path is "/users/Ada".
 */
export function document(path: string) {
  return _documentWithOptions(path, {});
}
/** @hidden */
// Multiple namespaces are not yet supported by Firestore.
export function namespace(namespace: string) {
  return _namespaceWithOptions(namespace, {});
}
/** @hidden */
// Multiple databases are not yet supported by Firestore.
export function database(database: string) {
  return _databaseWithOptions(database, {});
}

/** @hidden */
export function _databaseWithOptions(
  database: string = defaultDatabase,
  options: DeploymentOptions
) {
  return new DatabaseBuilder(database, options);
}

/** @hidden */
export function _namespaceWithOptions(
  namespace: string,
  options: DeploymentOptions
) {
  return _databaseWithOptions(defaultDatabase, options).namespace(namespace);
}

/** @hidden */
export function _documentWithOptions(path: string, options: DeploymentOptions) {
  return _databaseWithOptions(defaultDatabase, options).document(path);
}

export class DatabaseBuilder {
  /** @hidden */
  constructor(private database: string, private options: DeploymentOptions) {}

  namespace(namespace: string) {
    return new NamespaceBuilder(this.database, this.options, namespace);
  }

  document(path: string) {
    return new NamespaceBuilder(this.database, this.options).document(path);
  }
}

export class NamespaceBuilder {
  /** @hidden */
  constructor(
    private database: string,
    private options: DeploymentOptions,
    private namespace?: string
  ) {}

  document(path: string) {
    return new DocumentBuilder(() => {
      if (!process.env.GCLOUD_PROJECT) {
        throw new Error('process.env.GCLOUD_PROJECT is not set.');
      }
      const database = posix.join(
        'projects',
        process.env.GCLOUD_PROJECT,
        'databases',
        this.database
      );
      return posix.join(
        database,
        this.namespace ? `documents@${this.namespace}` : 'documents',
        path
      );
    }, this.options);
  }
}

interface EventData {
  value: proto.google.firestore.v1.IDocument;
  oldValue: proto.google.firestore.v1.IDocument;
}

function prop<T>(obj: Record<string, unknown>, field: string, generator: ()=>T): void {
  let cached: T | undefined = undefined;
  let fetched = false;
  Object.defineProperty(obj, field, {
    get: () => {
      if (!fetched) {
        cached = generator();
        fetched = true;
      }
      return cached;
    }
  });
}

function makeProxyDocument(raw: proto.google.firestore.v1.IDocument, ref: string): firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData> {
  const proxy: any = {};

  // NOTE: this is project-relative. Is it supposed to be project-relative or database-relative?
  prop<firebase.firestore.DocumentSnapshot>(proxy, "__realDoc", () => {
    return (firebase.firestore(apps().admin) as any).snapshot_(raw, proxy.readTime, 'json');
  })
  prop(proxy, "ref", () => makeProxyDocumentReference(raw.name || ref));
  prop(proxy, "id", () => proxy.ref.id);

  const createTime = dateToTimestampProto(raw.createTime);
  proxy.createTime = createTime ? Timestamp.fromProto(createTime) : undefined;
  const updateTime = dateToTimestampProto(raw.updateTime);
  proxy.updateTime = updateTime ? Timestamp.fromProto(updateTime) : undefined;
  const readTime = dateToTimestampProto((raw as any).readTime);
  proxy.readTime = readTime ? Timestamp.fromProto(readTime) : undefined;
  // Unlike the realtime database, a document can exist without properties according to tests.
  proxy.exists = !!createTime;
  prop(proxy, "__data", () => {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw.fields || {})) {
      data[key] = parseValue(value);
    }
    return data;
  });
  proxy.data = () => proxy.__data;
  proxy.get = (field: string | firestore.FieldPath): any => _.get(proxy.__data, field.toString());

  // private methods:
  proxy.protoField = (field: string | firestore.FieldPath): any => _.get(raw.fields, field.toString());
  proxy.toWriteProto = () => {
    return {
      update: {
        name: raw.name,
        fields: raw,
      },
    };
  };
  proxy.toDocumentProto = () => raw;
  proxy.isEqual = (other: firebase.firestore.DocumentSnapshot): boolean => {
    return proxy.__realDoc.isEqual(other);
  }

  return proxy as firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>;
}

function makeProxyDocumentReference(ref: string): firebase.firestore.DocumentReference {
  const proxy: any = {};

  const [,/*project*/,,/*database*/,, ...path] = ref.split("/");
  proxy.path = path.join("/");
  proxy.id = path[path.length - 1];
  proxy.formattedName = ref;
  prop(proxy, "__realRef", () => firebase.firestore(apps().admin).doc(proxy.path));
  prop(proxy, "parent", () => proxy.__realRef.parent);
  prop(proxy, "firestore", () => firebase.firestore(apps().admin));
  
  proxy.get = () => proxy.__realRef.get();
  proxy.collection = (collectionPath: string) => proxy.__realRef.collection(collectionPath);
  proxy.listCollections = () => proxy.__realRef.listCollections();
  proxy.create = (data: firebase.firestore.DocumentData) => proxy.__realRef.create(data);
  proxy.delete = (precondition?: firebase.firestore.Precondition) => proxy.__realRef.delete(precondition);
  // TOOD: fix any
  proxy.set = (
    data: firestore.DocumentData | Partial<firestore.DocumentData>,
    options?: {merge?: boolean, mergeFields?: string | firestore.FieldPath}
    ) => {
      return proxy.__realRef.set(data, options);
    }
  proxy.update = (
    dataOrField: firestore.UpdateData | string | firestore.FieldPath,
    ...preconditionOrValues: Array<unknown |string | firestore.FieldPath | firestore.Precondition>
  ) => {
    return proxy.__realRef.update(dataOrField, ...preconditionOrValues);
  }
  proxy.onSnapshot = (onNext: (snapshot: firestore.DocumentSnapshot<firestore.DocumentData>) => void, onError?: (error: Error) => void) => {
    return proxy.__realRef.onSnapshot(onNext, onError);
  }
  proxy.isEqual = (other: firestore.DocumentReference<firestore.DocumentData>): boolean => proxy.__realRef.isEqual(other);
  proxy.toProto = () => {
    referenceValue: ref;
  }
  proxy.withConverter = <U>(converter: firestore.FirestoreDataConverter<U> | null) => {
    return proxy.__realRef.withConverter(converter);
  }

  return proxy as firebase.firestore.DocumentReference;
}

function parseValue(value: proto.google.firestore.v1.IValue): unknown {
    if (value.booleanValue !== undefined) {
      return Boolean(value.booleanValue);
    } else if (value.bytesValue !== undefined) {
      // proto defines this as an array of int, but tests
      // clearly show that this is a string. Proto JSON conversions
      // are weird... but proto byte[] is a string in C++ so maybe it's
      // a string in the JSON API too?
      return Buffer.from(value.bytesValue as unknown as string, 'base64');
    } else if (value.doubleValue !== undefined) {
      return Number(value.doubleValue);
    } else if (value.integerValue !== undefined) {
      return Number(value.integerValue);
    } else if (value.nullValue !== undefined) {
      return null;
    } else if (value.stringValue !== undefined) {
      return value.stringValue;
    } else if (value.timestampValue !== undefined) {
      const protoType = dateToTimestampProto(value.timestampValue as string);
      return Timestamp.fromProto(protoType);
    } else if (value.geoPointValue !== undefined) {
      return GeoPoint.fromProto(value.geoPointValue);
    } else if (value.referenceValue !== undefined) {
      return makeProxyDocumentReference(value.referenceValue);
    } else if (value.mapValue !== undefined) {
      const res = {}
      for (const [key, raw] of Object.entries(value.mapValue.fields)) {
        res[key] = parseValue(raw);
      }
      return res;
    } else if (value.arrayValue !== undefined) {
      const res = []
      for (const raw of value.arrayValue.values) {
        res.push(parseValue(raw));
      }
      return res;
    } else {
      // Should never happen
      throw new Error("Unexpected parse error. Could not create scalar value for IValue " + JSON.stringify(value));
    }
}

/** @hidden */
export function snapshotConstructor(event: Event): DocumentSnapshot {
  const data = event.data as EventData;
  return makeProxyDocument(data.value, event.context.resource.name);
}

/** @hidden */
// TODO remove this function when wire format changes to new format
export function beforeSnapshotConstructor(event: Event): DocumentSnapshot {
  const data = event.data as EventData;
  return makeProxyDocument(data.oldValue, event.context.resource.name);
}

function changeConstructor(raw: Event) {
  return Change.fromObjects(
    beforeSnapshotConstructor(raw),
    snapshotConstructor(raw)
  );
}

export class DocumentBuilder {
  /** @hidden */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {
    // TODO what validation do we want to do here?
  }

  /** Respond to all document writes (creates, updates, or deletes). */
  onWrite(
    handler: (
      change: Change<DocumentSnapshot>,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<Change<DocumentSnapshot>> {
    return this.onOperation(handler, 'document.write', changeConstructor);
  }

  /** Respond only to document updates. */
  onUpdate(
    handler: (
      change: Change<QueryDocumentSnapshot>,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<Change<QueryDocumentSnapshot>> {
    return this.onOperation(handler, 'document.update', changeConstructor);
  }

  /** Respond only to document creations. */
  onCreate(
    handler: (
      snapshot: QueryDocumentSnapshot,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<QueryDocumentSnapshot> {
    return this.onOperation(handler, 'document.create', snapshotConstructor);
  }

  /** Respond only to document deletions. */
  onDelete(
    handler: (
      snapshot: QueryDocumentSnapshot,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<QueryDocumentSnapshot> {
    return this.onOperation(
      handler,
      'document.delete',
      beforeSnapshotConstructor
    );
  }

  private onOperation<T>(
    handler: (data: T, context: EventContext) => PromiseLike<any> | any,
    eventType: string,
    dataConstructor: (raw: Event) => any
  ): CloudFunction<T> {
    return makeCloudFunction({
      handler,
      provider,
      eventType,
      service,
      triggerResource: this.triggerResource,
      legacyEventType: `providers/cloud.firestore/eventTypes/${eventType}`,
      dataConstructor,
      options: this.options,
    });
  }
}
