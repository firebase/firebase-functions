// The MIT License (MIT)
//
// Copyright (c) 2015 Firebase
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
import { apps } from '../apps';
import {Event, CloudFunction, makeCloudFunction} from '../cloud-functions';
import {normalizePath, applyChange, pathParts, valAt, joinPath} from '../utils';
import * as firebase from 'firebase-admin';
import {config} from '../index';

/** @internal */
export const provider = 'google.firebase.database';

// NOTE(inlined): Should we relax this a bit to allow staging or alternate implementations of our API?
const databaseURLRegex = new RegExp('https://([^.]+).firebaseio.com');

/**
 * Handle events at a Firebase Realtime Database ref.
 *
 * The database.ref() functions behave very similarly to the normal Firebase
 * SDKs. Any change to the database that affects the data at or below ref will
 * fire an event in Cloud Functions.
 *
 * There are three important differences between listening to a database event
 * in Cloud Functions and using the Realtime Database SDK:
 * 1. The Cloud Functions SDK allows wildcards in the ref name. Any path
 *    component in curly brackets ({}) will match any value. The actual value
 *    that matched will be returned in eventnt.params. E.g. ref('foo/{bar}') will
 *    match a change at 'foo/baz' and the event will have params {bar: 'baz'}.
 * 2. Unlike the Realtime Database SDK, Cloud Functions will not fire an event
 *    for data that already existed before the Cloud Function was deployed.
 * 3. Cloud Function events have access to more information than the normal
 *    SDK. E.g. the snapshot passed to a Cloud Function has access to the
 *    previous event data as well as the user who triggered the change.
 */
export function ref(ref: string): RefBuilder {
  const normalized = normalizePath(ref);
  const databaseURL = config().firebase.databaseURL;
  if (!databaseURL) {
    throw new Error('Missing expected config value firebase.databaseURL');
  }
  const match = databaseURL.match(databaseURLRegex);
  if (!match) {
    throw new Error('Invalid value for config firebase.databaseURL: ' + databaseURL);
  }
  const subdomain = match[1];
  let resource = `projects/_/instances/${subdomain}/refs/${normalized}`;
  return new RefBuilder(apps(), resource);
}

/** Builder used to create Cloud Functions for Firebase Realtime Database References. */
export class RefBuilder {
  /** @internal */
  constructor(private apps: apps.Apps, private resource) {}

  /** Respond to any write that affects a ref. */
  onWrite(handler: (event: Event<DeltaSnapshot>) => PromiseLike<any> | any): CloudFunction<DeltaSnapshot> {
    const dataConstructor  = (raw: Event<any>) => {
      if (raw.data instanceof DeltaSnapshot) {
        return raw.data;
      }
      return new DeltaSnapshot(this.apps.forMode(raw.auth), this.apps.admin, raw);
    };
    return makeCloudFunction({
      provider, handler,
      eventType: 'ref.write',
      resource: this.resource,
      dataConstructor,
      before: (payload) => this.apps.retain(payload),
      after: (payload) => this.apps.release(payload),
    });
  }
}

export class DeltaSnapshot implements firebase.database.DataSnapshot {
  private _adminRef: firebase.database.Reference;
  private _ref: firebase.database.Reference;
  private _path: string;
  private _data: any;
  private _delta: any;
  private _newData: any;

  private _childPath: string;
  private _isPrevious: boolean;

  constructor(private app: firebase.app.App, private adminApp: firebase.app.App, event: Event<any>) {
    if (event) {
      let resourceRegex = `projects/([^/]+)/instances/([^/]+)/refs(/.+)?`;
      let match = event.resource.match(new RegExp(resourceRegex));
      if (!match) {
        throw new Error(`Unexpected resource string for Firebase Realtime Database event: ${event.resource}. ` +
          'Expected string in the format of "projects/_/instances/{firebaseioSubdomain}/refs/{ref=**}"');
      }
      let [, project, /* instance */ , ref] = match;
      if (project !== '_') {
        throw new Error(`Expect project to be '_' in a Firebase Realtime Database event`);
      }

      this._path = normalizePath(ref);
      this._data = event.data.data;
      this._delta = event.data.delta;
      this._newData = applyChange(this._data, this._delta);
    }
  }

  get ref(): firebase.database.Reference {
    if (!this._ref) {
      this._ref = this.app.database().ref(this._fullPath());
    }
    return this._ref;
  }

  get adminRef(): firebase.database.Reference {
    if (!this._adminRef) {
      this._adminRef = this.adminApp.database().ref(this._fullPath());
    }
    return this._adminRef;
  }

  get key(): string {
    let last = _.last(pathParts(this._fullPath()));
    return (!last || last === '') ? null : last;
  }

  val(): any {
    let parts = pathParts(this._childPath);
    let source = this._isPrevious ? this._data : this._newData;
    let node = _.cloneDeep(parts.length ? _.get(source, parts, null) : source);
    return this._checkAndConvertToArray(node);
  }

  // TODO(inlined): figure out what to do here
  exportVal(): any { return this.val(); }

  // TODO(inlined): figure out what to do here
  getPriority(): any {
    return 0;
  }

  exists(): boolean {
    return !_.isNull(this.val());
  }

  child(childPath?: string): DeltaSnapshot {
    if (!childPath) {
      return this;
    }
    return this._dup(this._isPrevious, childPath);
  }

  get previous(): DeltaSnapshot {
    return this._isPrevious ? this : this._dup(true);
  }

  get current(): DeltaSnapshot {
    return this._isPrevious ? this._dup(false) : this;
  }

  changed(): boolean {
    return valAt(this._delta, this._childPath) !== undefined;
  }

  // TODO(inlined) what is this boolean for?
  forEach(action: (a: DeltaSnapshot) => boolean): boolean {
    let val = this.val();
    if (_.isPlainObject(val)) {
      _.keys(val).forEach(key => action(this.child(key)));
    }
    return false;
  }

  hasChild(childPath: string): boolean {
    return this.child(childPath).exists();
  }

  hasChildren(): boolean {
    let val = this.val();
    return _.isPlainObject(val) && _.keys(val).length > 0;
  }

  numChildren(): number {
    let val = this.val();
    return _.isPlainObject(val) ? Object.keys(val).length : 0;
  }

  /* Recursive function to check if keys are numeric & convert node object to array if they are */
  private _checkAndConvertToArray(node): any {
    if (node === null || typeof node === 'undefined') {
      return null;
    }
    if (typeof node !== 'object') {
      return node;
    }
    let obj = {};
    let numKeys = 0;
    let maxKey = 0;
    let allIntegerKeys = true;
    _.forEach(node, (childNode, key) => {
      obj[key] = this._checkAndConvertToArray(childNode);
      numKeys++;
      const integerRegExp = /^(0|[1-9]\d*)$/;
      if (allIntegerKeys && integerRegExp.test(key)) {
        maxKey = Math.max(maxKey, Number(key));
      } else {
        allIntegerKeys = false;
      }
    });

    if (allIntegerKeys && maxKey < 2 * numKeys) {
      // convert to array.
      let array = [];
      _.forOwn(obj, (val, key) => {
        array[key] = val;
      });

      return array;
    }
    return obj;
  }

  private _dup(previous: boolean, childPath?: string): DeltaSnapshot {
    let dup = new DeltaSnapshot(this.app, this.adminApp, null);
    [dup._path, dup._data, dup._delta, dup._childPath, dup._newData] =
      [this._path, this._data, this._delta, this._childPath, this._newData];

    if (previous) {
      dup._isPrevious = true;
    }

    if (childPath) {
      dup._childPath = joinPath(dup._childPath, childPath);
    }

    return dup;
  }

  private _fullPath(): string {
    let out = (this._path || '') + (this._childPath || '');
    if (out === '') {
      out = '/';
    }
    return out;
  }
}
