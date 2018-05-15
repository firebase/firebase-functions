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
import { LegacyEvent, CloudFunction, makeCloudFunction, Event, EventContext, Change } from '../cloud-functions';
import { normalizePath, applyChange, pathParts, joinPath } from '../utils';
import * as firebase from 'firebase-admin';
import { firebaseConfig } from '../config';

/** @internal */
export const provider = 'google.firebase.database';
/** @internal */
export const service = 'firebaseio.com';

// NOTE(inlined): Should we relax this a bit to allow staging or alternate implementations of our API?
const databaseURLRegex = new RegExp('https://([^.]+).firebaseio.com');

/**
 * Pick the Realtime Database instance to use. If omitted, will pick the default database for your project.
 */
export function instance(instance: string): InstanceBuilder {
  return new InstanceBuilder(instance);
}

export class InstanceBuilder {
  /* @internal */
  constructor(private instance: string) {}

  ref(path: string): RefBuilder {
    const normalized = normalizePath(path);
    return new RefBuilder(apps(), () => `projects/_/instances/${this.instance}/refs/${normalized}`);
  }
}

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
  const resourceGetter = () => {
    const normalized = normalizePath(path);
    const databaseURL = firebaseConfig().databaseURL;
    if (!databaseURL) {
      throw new Error('Missing expected firebase config value databaseURL, ' +
        'config is actually' + JSON.stringify(firebaseConfig()) +
        '\n If you are unit testing, please set process.env.FIREBASE_CONFIG');
    }
    const match = databaseURL.match(databaseURLRegex);
    if (!match) {
      throw new Error('Invalid value for config firebase.databaseURL: ' + databaseURL);
    }
    const subdomain = match[1];
    return `projects/_/instances/${subdomain}/refs/${normalized}`;
  };

  return new RefBuilder(apps(), resourceGetter);
}

/** Builder used to create Cloud Functions for Firebase Realtime Database References. */
export class RefBuilder {
  /** @internal */
  constructor(private apps: apps.Apps, private triggerResource: () => string) { }

  /** Respond to any write that affects a ref. */
  onWrite(handler: (
    change: Change<DataSnapshot>,
    context: EventContext) => PromiseLike<any> | any,
  ): CloudFunction<Change<DataSnapshot>> {
    return this.onOperation(handler, 'ref.write', this.changeConstructor);
  }

  /** Respond to update on a ref. */
  onUpdate(handler: (
    change: Change<DataSnapshot>,
    context: EventContext) => PromiseLike<any> | any,
  ): CloudFunction<Change<DataSnapshot>> {
    return this.onOperation(handler, 'ref.update', this.changeConstructor);
  }

  /** Respond to new data on a ref. */
  onCreate(handler: (
    snapshot: DataSnapshot,
    context: EventContext) => PromiseLike<any> | any,
  ): CloudFunction<DataSnapshot> {
    let dataConstructor = (raw: LegacyEvent) => {
      let [dbInstance, path] = resourceToInstanceAndPath(raw.resource);
      return new DataSnapshot(
        raw.data.delta,
        path,
        this.apps.admin,
        dbInstance
      );
    };
    return this.onOperation(handler, 'ref.create', dataConstructor);
  }

  /** Respond to all data being deleted from a ref. */
  onDelete(handler: (
    snapshot: DataSnapshot,
    context: EventContext) => PromiseLike<any> | any,
  ): CloudFunction<DataSnapshot> {
    let dataConstructor = (raw: LegacyEvent) => {
      let [dbInstance, path] = resourceToInstanceAndPath(raw.resource);
      return new DataSnapshot(
        raw.data.data,
        path,
        this.apps.admin,
        dbInstance
      );
    };
    return this.onOperation(handler, 'ref.delete', dataConstructor);
  }

  private onOperation<T>(
    handler: (data: T, context: EventContext) => PromiseLike<any> | any,
    eventType: string,
    dataConstructor: (raw: Event | LegacyEvent) => any): CloudFunction<T> {

    return makeCloudFunction({
      handler,
      provider,
      service,
      eventType,
      legacyEventType: `providers/${provider}/eventTypes/${eventType}`,
      triggerResource: this.triggerResource,
      dataConstructor: dataConstructor,
      before: (event) => this.apps.retain(),
      after: (event) => this.apps.release(),
    });
  }

  private changeConstructor = (raw: LegacyEvent): Change<DataSnapshot> => {
    let [dbInstance, path] = resourceToInstanceAndPath(raw.resource);
    let before = new DataSnapshot(
      raw.data.data,
      path,
      this.apps.admin,
      dbInstance
    );
    let after = new DataSnapshot(
      applyChange(raw.data.data, raw.data.delta),
      path,
      this.apps.admin,
      dbInstance
    );
    return {
      before: before,
      after: after,
    };
  };
}

/* Utility function to extract database reference from resource string */
/** @internal */
export function resourceToInstanceAndPath(resource: string) {
  let resourceRegex = `projects/([^/]+)/instances/([^/]+)/refs(/.+)?`;
  let match = resource.match(new RegExp(resourceRegex));
  if (!match) {
    throw new Error(`Unexpected resource string for Firebase Realtime Database event: ${resource}. ` +
      'Expected string in the format of "projects/_/instances/{firebaseioSubdomain}/refs/{ref=**}"');
  }
  let [, project, dbInstanceName, path] = match;
  if (project !== '_') {
    throw new Error(`Expect project to be '_' in a Firebase Realtime Database event`);
  }
  let dbInstance = 'https://' + dbInstanceName + '.firebaseio.com';
  return [dbInstance, path];
}

export class DataSnapshot {
  public instance: string;
  private _ref: firebase.database.Reference;
  private _path: string;
  private _data: any;
  private _childPath: string;

  constructor(
    data: any,
    path?: string, // path will be undefined for the database root
    private app?: firebase.app.App,
    instance?: string,
  ) {
    if (instance) { // SDK always supplies instance, but user's unit tests may not
      this.instance = instance;
    } else if (app) {
      this.instance = app.options.databaseURL;
    } else if (process.env.GCLOUD_PROJECT) {
      this.instance = 'https://' + process.env.GCLOUD_PROJECT + '.firebaseio.com';
    }

    this._path = path;
    this._data = data;
  }

  /** Ref returns a reference to the database with full admin access. */
  get ref(): firebase.database.Reference {
    if (!this.app) { // may be unpopulated in user's unit tests
      throw new Error('Please supply a Firebase app in the constructor for DataSnapshot' +
      ' in order to use the .ref method.');
    }
    if (!this._ref) {
      this._ref = this.app.database(this.instance).ref(this._fullPath());
    }
    return this._ref;
  }

  get key(): string {
    let last = _.last(pathParts(this._fullPath()));
    return (!last || last === '') ? null : last;
  }

  val(): any {
    let parts = pathParts(this._childPath);
    let source = this._data;
    let node = _.cloneDeep(parts.length ? _.get(source, parts, null) : source);
    return this._checkAndConvertToArray(node);
  }

  // TODO(inlined): figure out what to do here
  exportVal(): any { return this.val(); }

  // TODO(inlined): figure out what to do here
  getPriority(): string|number|null {
    return 0;
  }

  exists(): boolean {
    return !_.isNull(this.val());
  }

  child(childPath: string): DataSnapshot {
    if (!childPath) {
      return this;
    }
    return this._dup(childPath);
  }

  forEach(action: (a: DataSnapshot) => boolean): boolean {
    let val = this.val();
    if (_.isPlainObject(val)) {
      return _.some(val, (value, key: string) => action(this.child(key)) === true);
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
  private _checkAndConvertToArray(node: any): any {
    if (node === null || typeof node === 'undefined') {
      return null;
    }
    if (typeof node !== 'object') {
      return node;
    }
    let obj: any = {};
    let numKeys = 0;
    let maxKey = 0;
    let allIntegerKeys = true;
    for (let key in node) {
      if (!node.hasOwnProperty(key)) { continue; }
      let childNode = node[key];
      obj[key] = this._checkAndConvertToArray(childNode);
      numKeys++;
      const integerRegExp = /^(0|[1-9]\d*)$/;
      if (allIntegerKeys && integerRegExp.test(key)) {
        maxKey = Math.max(maxKey, Number(key));
      } else {
        allIntegerKeys = false;
      }
    }

    if (allIntegerKeys && maxKey < 2 * numKeys) {
      // convert to array.
      let array: any = [];
      _.forOwn(obj, (val, key) => {
        array[key] = val;
      });

      return array;
    }
    return obj;
  }

  private _dup(childPath?: string): DataSnapshot {
    let dup = new DataSnapshot(this._data, undefined, this.app, this.instance);
    [dup._path, dup._childPath] = [this._path, this._childPath];

    if (childPath) {
      dup._childPath = joinPath(dup._childPath, childPath);
    }

    return dup;
  }

  private _fullPath(): string {
    let out = (this._path || '') + '/' + (this._childPath || '');
    return out;
  }
}
