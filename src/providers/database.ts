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
import { apps } from '../apps';
import { Event, CloudFunction, makeCloudFunction } from '../cloud-functions';
import { normalizePath, applyChange, pathParts, valAt, joinPath } from '../utils';
import * as firebase from 'firebase-admin';
import { config } from '../index';

/** @internal */
export const provider = 'google.firebase.database';

// NOTE(inlined): Should we relax this a bit to allow staging or alternate implementations of our API?
const databaseURLRegex = new RegExp('https://([^.]+).firebaseio.com');

/**
 * Handle events at a Firebase Realtime Database Reference.
 *
 * This method behaves very similarly to the method of the same name in the
 * client and Admin Firebase SDKs. Any change to the Database that affects the
 * data at or below the provided `path` will fire an event in Cloud Functions.
 *
 * There are three important differences between listening to a Realtime
 * Database event in Cloud Functions and using the Realtime Database in the
 * client and Admin SDKs:
 * 1. Cloud Functions allows wildcards in the `path` name. Any `path` component
 *    in curly brackets (`{}`) is a wildcard that matches all strings. The value
 *    that matched a certain invocation of a Cloud Function is returned as part
 *    of the `event.params` object. For example, `ref("messages/{messageId}")`
 *    matches changes at `/messages/message1` or `/messages/message2`, resulting
 *    in  `event.params.messageId` being set to `"message1"` or `"message2"`,
 *    respectively.
 * 2. Cloud Functions do not fire an event for data that already existed before
 *    the Cloud Function was deployed.
 * 3. Cloud Function events have access to more information, including a
 *    snapshot of the previous event data and information about the user who
 *    triggered the Cloud Function.
 */
export function ref(path: string): RefBuilder {
  const normalized = normalizePath(path);
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
  constructor(private apps: apps.Apps, private resource) { }

  /** Respond to any write that affects a ref. */
  onWrite(handler: (event: Event<DeltaSnapshot>) => PromiseLike<any> | any): CloudFunction<DeltaSnapshot> {
    const dataConstructor = (raw: Event<any>) => {
      if (raw.data instanceof DeltaSnapshot) {
        return raw.data;
      }
      return new DeltaSnapshot(
        this.apps.forMode(raw.auth),
        this.apps.admin,
        raw.data.data,
        raw.data.delta,
        resourceToPath(raw.resource),
      );
    };
    return makeCloudFunction({
      provider, handler,
      eventType: 'ref.write',
      resource: this.resource,
      dataConstructor,
      before: (event) => {
        // BUG(36000428) Remove when no longer necessary
        _.forEach(event.params, (val, key) => {
          event.resource = _.replace(event.resource, `{${key}}`, val);
        });
        this.apps.retain(event);
      },
      after: (event) => this.apps.release(event),
    });
  }
}

/* Utility function to extract database reference from resource string */
/** @internal */
export function resourceToPath(resource) {
  let resourceRegex = `projects/([^/]+)/instances/([^/]+)/refs(/.+)?`;
  let match = resource.match(new RegExp(resourceRegex));
  if (!match) {
    throw new Error(`Unexpected resource string for Firebase Realtime Database event: ${resource}. ` +
      'Expected string in the format of "projects/_/instances/{firebaseioSubdomain}/refs/{ref=**}"');
  }
  let [, project, /* instance */, path] = match;
  if (project !== '_') {
    throw new Error(`Expect project to be '_' in a Firebase Realtime Database event`);
  }
  return path;
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

  constructor(
    private app: firebase.app.App,
    private adminApp: firebase.app.App,
    data: any,
    delta: any,
    path?: string // path will be undefined for the database root
  ) {
    if (delta !== undefined) {
      this._path = path;
      this._data = data;
      this._delta = delta;
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

  child(childPath: string): DeltaSnapshot {
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

  /**
   * Prints the value of the snapshot; use '.previous.toJSON()' and '.current.toJSON()' to explicitly see
   * the previous and current values of the snapshot.
   */
  toJSON(): Object {
    return this.val();
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
    let dup = new DeltaSnapshot(this.app, this.adminApp, undefined, undefined);
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
