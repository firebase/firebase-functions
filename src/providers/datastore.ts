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

import * as _ from 'lodash';
import { makeCloudFunction, CloudFunction, Event } from '../cloud-functions';

/** @internal */
export const provider = (new Buffer('Y2xvdWQuZmlyZXN0b3Jl', 'base64')).toString();

/** @internal */
export const defaultDatabase = '(default)';

export function database(database: string = defaultDatabase) {
  return new DatabaseBuilder(`projects/${process.env.GCLOUD_PROJECT}/databases/${database}`);
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
    return new NamespaceBuilder(`${this.resource}/documents@${namespace}`);
  }

  document(path: string) {
    return (new NamespaceBuilder(`${this.resource}/documents`)).document(path);
  }
}

export class NamespaceBuilder {
  /** @internal */
  constructor(private resource: string) { }

  document(path: string) {
    return new DocumentBuilder(`${this.resource}/${path}`);
  }
}

export class DocumentBuilder {
  /** @internal */
  constructor(private resource: string) {
    // TODO what validation do we want to do here?
  }

  onWrite(handler: (event: Event<any>) => PromiseLike<any> | any): CloudFunction<any> {
    const dataConstructor = (raw: Event<any>) => {
      if (raw.data instanceof DeltaDocumentSnapshot) {
        return raw.data;
      }
      return new DeltaDocumentSnapshot(
        _.get(raw.data, 'value.fields', {}),
        _.get(raw.data, 'oldValue.fields', {})
      );
    };
    return makeCloudFunction({
      provider, handler,
      resource: this.resource,
      eventType: 'document.write',
      dataConstructor,
    });
  }
}

export class DeltaDocumentSnapshot {

  private _data: object;
  private _previous: DeltaDocumentSnapshot;

  constructor(private _raw: object, private _old: object) { }

  data(): object {
    if (!this._data) {
      this._data = _.mapValues(this._raw, (field) => {
        return this._transformField(field);
      });
    }
    return this._data;
  }

  get(key: string): any {
    return _.get(this.data(), key, null);
  }

  get previous(): DeltaDocumentSnapshot {
    if (_.isEmpty(this._old)) {
      return null;
    }
    this._previous = new DeltaDocumentSnapshot(this._old, null);
    return this._previous;
  }

  private _transformField(field: object): any {
    // field is an object with only 1 key-value pair, so this will only loop once
    let result;
    _.forEach(field, (fieldValue, fieldType) => {
        if (fieldType === 'arrayValue') {
          result = _.map(_.get(fieldValue, 'values', []), (elem) => {
            return this._transformField(elem);
          });
        } else if (fieldType === 'mapValue') {
          result = _.mapValues(_.get(fieldValue, 'fields', {}), (val) => {
            return this._transformField(val);
          });
        } else if (fieldType === 'integerValue'
          || fieldType === 'doubleValue'
          || fieldType === 'longValue') {
          result = Number(fieldValue);
        } else if (fieldType === 'timestampValue') {
          result = new Date(fieldValue);
        } else if (fieldType === 'bytesValue') {
            try {
                result = Buffer.from(fieldValue, 'base64');
            } catch (e) { // Node version < 6, which is the case for Travis CI
                result = new Buffer(fieldValue, 'base64');
            }
        } else if (fieldType === 'referenceValue') {
          console.log('WARNING: you have a data field which is a datastore reference. ' +
          'There will be a breaking change later which will change it from a string to a reference object.');
          result = fieldValue;
        } else {
          result = fieldValue;
        }
    });
    return result;
  }
}
