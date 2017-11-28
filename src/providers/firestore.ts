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

import { posix } from 'path';
import * as _ from 'lodash';
import * as firebase from 'firebase-admin';
import { apps } from '../apps';
import { makeCloudFunction, CloudFunction, Event } from '../cloud-functions';
import { dateToTimestampProto } from '../encoder';

/** @internal */
export const provider = 'cloud.firestore';

/** @internal */
export const defaultDatabase = '(default)';
let firestoreInstance;

export function database(database: string = defaultDatabase) {
  return new DatabaseBuilder(posix.join('projects', process.env.GCLOUD_PROJECT, 'databases', database));
}

export function namespace(namespace: string) {
  return database().namespace(namespace);
}

export function document(path: string) {
  return database().document(path);
}

export class DatabaseBuilder {
  /** @internal */
  constructor(private resource: string) { }

  namespace(namespace: string) {
    return new NamespaceBuilder(`${posix.join(this.resource, 'documents')}@${namespace}`);
  }

  document(path: string) {
    return (new NamespaceBuilder(posix.join(this.resource, 'documents'))).document(path);
  }
}

export class NamespaceBuilder {
  /** @internal */
  constructor(private resource: string) { }

  document(path: string) {
    return new DocumentBuilder(posix.join(this.resource, path));
  }
}

export interface DeltaDocumentSnapshot {
  exists: Boolean;
  ref: any;
  id: string;
  createTime: string;
  updateTime: string;
  readTime: string;
  previous: any;
  data: () => any;
  get: (key: string) => any;
};

function isDeltaDocumentSnapshot(data: any): data is DeltaDocumentSnapshot {
  return 'exists' in data;
};

function getValueProto(event, valueFieldName) {
  let data = event.data;
  if (_.isEmpty(_.get(data, valueFieldName))) {
    // Firestore#snapshot_ takes resource string instead of proto for a non-existent snapshot
    return event.resource;
  }
  let proto = {
    fields: convertToFieldsProto(_.get(data, [valueFieldName, 'fields'], {})),
    createTime: dateToTimestampProto(_.get(data, [valueFieldName, 'createTime'])),
    updateTime: dateToTimestampProto(_.get(data, [valueFieldName, 'updateTime'])),
    name: _.get(data, [valueFieldName, 'name'], event.resource),
  };
  return proto;
};

function convertToFieldsProto(fields): object {
  if (!fields) {
    return {};
  }
  function convertHelper(data) {
    let result;
    _.forEach(data, (value: any, valueType: string) => {
      let dataPart;
      if (valueType === 'arrayValue') {
        let array = _.get(value, 'values', []);
        dataPart = {
          arrayValue: {
            values: _.map(array, (elem) => {
              return convertHelper(elem);
            }),
          },
        };
      } else if (valueType === 'mapValue') {
        let map = _.get(value, 'fields', {});
        dataPart = {
          mapValue: {
            fields: _.mapValues(map, (val) => {
              return convertHelper(val);
            }),
          },
        };
      } else if (valueType === 'timestampValue') {
        dataPart = {timestampValue: dateToTimestampProto(value)};
      } else {
        dataPart = data;
      }
      result = _.merge({}, dataPart, {valueType: valueType});
    });
    return result;
  }

  return _.mapValues(fields, (data: object) => {
    return convertHelper(data);
  });
};

/** @internal */
export function dataConstructor(raw: Event<any>) {
  if (isDeltaDocumentSnapshot(raw.data)) {
    return raw.data;
  }
  if (!firestoreInstance) {
    firestoreInstance = firebase.firestore(apps().admin);
  }
  let valueProto = getValueProto(raw, 'value');
  let readTime = dateToTimestampProto(_.get(raw.data, 'value.readTime'));
  let snapshot = firestoreInstance.snapshot_(valueProto, readTime) as DeltaDocumentSnapshot;
  Object.defineProperty(snapshot, 'previous', {
    get: () => {
      let oldValueProto = getValueProto(raw, 'oldValue');
      let oldReadTime = dateToTimestampProto(_.get(raw.data, 'oldValue.readTime'));
      return firestoreInstance.snapshot_(oldValueProto, oldReadTime) as DeltaDocumentSnapshot;
    },
  });
  return snapshot;
};

export class DocumentBuilder {
  /** @internal */
  constructor(private resource: string) {
    // TODO what validation do we want to do here?
  }

  /** Respond to all document writes (creates, updates, or deletes). */
  onWrite(handler: (event: Event<DeltaDocumentSnapshot>) => PromiseLike<any> |
  any): CloudFunction<DeltaDocumentSnapshot> {
    return this.onOperation(handler, 'document.write');
  }

  /** Respond only to document creations. */
  onCreate(handler: (event: Event<DeltaDocumentSnapshot>) => PromiseLike<any> |
  any): CloudFunction<DeltaDocumentSnapshot> {
    return this.onOperation(handler, 'document.create');
  }

  /** Respond only to document updates. */
  onUpdate(handler: (event: Event<DeltaDocumentSnapshot>) => PromiseLike<any> |
  any): CloudFunction<DeltaDocumentSnapshot> {
    return this.onOperation(handler, 'document.update');
  }

  /** Respond only to document deletions. */
  onDelete(handler: (event: Event<DeltaDocumentSnapshot>) => PromiseLike<any> |
  any): CloudFunction<DeltaDocumentSnapshot> {
    return this.onOperation(handler, 'document.delete');
  }

  private onOperation(
    handler: (event: Event<DeltaDocumentSnapshot>) => PromiseLike<any> | any,
    eventType: string): CloudFunction<DeltaDocumentSnapshot> {
      return makeCloudFunction({
        provider, handler,
        resource: this.resource,
        eventType: eventType,
        dataConstructor,
      });
  }
}
