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
import { dateToTimestampProto } from '../encoder';
import { DeploymentOptions } from '../function-configuration';

/** @hidden */
export const provider = 'google.firestore';
/** @hidden */
export const service = 'firestore.googleapis.com';
/** @hidden */
export const defaultDatabase = '(default)';
let firestoreInstance: any;
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

function _getValueProto(data: any, resource: string, valueFieldName: string) {
  if (_.isEmpty(_.get(data, valueFieldName))) {
    // Firestore#snapshot_ takes resource string instead of proto for a non-existent snapshot
    return resource;
  }
  const proto = {
    fields: _.get(data, [valueFieldName, 'fields'], {}),
    createTime: dateToTimestampProto(
      _.get(data, [valueFieldName, 'createTime'])
    ),
    updateTime: dateToTimestampProto(
      _.get(data, [valueFieldName, 'updateTime'])
    ),
    name: _.get(data, [valueFieldName, 'name'], resource),
  };
  return proto;
}

/** @hidden */
export function snapshotConstructor(event: Event): DocumentSnapshot {
  if (!firestoreInstance) {
    firestoreInstance = firebase.firestore(apps().admin);
  }
  const valueProto = _getValueProto(
    event.data,
    event.context.resource.name,
    'value'
  );
  const readTime = dateToTimestampProto(_.get(event, 'data.value.readTime'));
  return firestoreInstance.snapshot_(valueProto, readTime, 'json');
}

/** @hidden */
// TODO remove this function when wire format changes to new format
export function beforeSnapshotConstructor(event: Event): DocumentSnapshot {
  if (!firestoreInstance) {
    firestoreInstance = firebase.firestore(apps().admin);
  }
  const oldValueProto = _getValueProto(
    event.data,
    event.context.resource.name,
    'oldValue'
  );
  const oldReadTime = dateToTimestampProto(
    _.get(event, 'data.oldValue.readTime')
  );
  return firestoreInstance.snapshot_(oldValueProto, oldReadTime, 'json');
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
