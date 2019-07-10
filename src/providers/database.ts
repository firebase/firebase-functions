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
import { apps } from '../apps';
import {
  Change,
  CloudFunction,
  Event,
  EventContext,
  makeCloudFunction,
} from '../cloud-functions';
import { firebaseConfig } from '../config';
import { DeploymentOptions } from '../function-configuration';
import { applyChange, joinPath, normalizePath, pathParts } from '../utils';

/** @hidden */
export const provider = 'google.firebase.database';
/** @hidden */
export const service = 'firebaseio.com';

// NOTE(inlined): Should we relax this a bit to allow staging or alternate implementations of our API?
const databaseURLRegex = new RegExp('https://([^.]+).firebaseio.com');

/**
 * Selects a database instance that will trigger the function.
 * If omitted, will pick the default database for your project.
 * @param instance The Realtime Database instance to use.
 */
export function instance(instance: string) {
  return _instanceWithOptions(instance, {});
}

/**
 * Select Firebase Realtime Database Reference to listen to.
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
 *    of the `context.params` object. For example, `ref("messages/{messageId}")`
 *    matches changes at `/messages/message1` or `/messages/message2`, resulting
 *    in  `context.params.messageId` being set to `"message1"` or `"message2"`,
 *    respectively.
 * 2. Cloud Functions do not fire an event for data that already existed before
 *    the Cloud Function was deployed.
 * 3. Cloud Function events have access to more information, including information
 *    about the user who triggered the Cloud Function.
 * @param ref Path of the database to listen to.
 */
export function ref(path: string) {
  return _refWithOptions(path, {});
}

/** @hidden */
export function _instanceWithOptions(
  instance: string,
  options: DeploymentOptions
): InstanceBuilder {
  return new InstanceBuilder(instance, options);
}

export class InstanceBuilder {
  /** @hidden */
  constructor(private instance: string, private options: DeploymentOptions) {}

  ref(path: string): RefBuilder {
    const normalized = normalizePath(path);
    return new RefBuilder(
      apps(),
      () => `projects/_/instances/${this.instance}/refs/${normalized}`,
      this.options
    );
  }
}

/** @hidden */
export function _refWithOptions(
  path: string,
  options: DeploymentOptions
): RefBuilder {
  const resourceGetter = () => {
    const normalized = normalizePath(path);
    const databaseURL = firebaseConfig().databaseURL;
    if (!databaseURL) {
      throw new Error(
        'Missing expected firebase config value databaseURL, ' +
          'config is actually' +
          JSON.stringify(firebaseConfig()) +
          '\n If you are unit testing, please set process.env.FIREBASE_CONFIG'
      );
    }
    const match = databaseURL.match(databaseURLRegex);
    if (!match) {
      throw new Error(
        'Invalid value for config firebase.databaseURL: ' + databaseURL
      );
    }
    const subdomain = match[1];
    return `projects/_/instances/${subdomain}/refs/${normalized}`;
  };

  return new RefBuilder(apps(), resourceGetter, options);
}

/** Builder used to create Cloud Functions for Firebase Realtime Database References. */
export class RefBuilder {
  /** @hidden */
  constructor(
    private apps: apps.Apps,
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {}

  /** Respond to any write that affects a ref. */
  onWrite(
    handler: (
      change: Change<DataSnapshot>,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<Change<DataSnapshot>> {
    return this.onOperation(handler, 'ref.write', this.changeConstructor);
  }

  /** Respond to update on a ref. */
  onUpdate(
    handler: (
      change: Change<DataSnapshot>,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<Change<DataSnapshot>> {
    return this.onOperation(handler, 'ref.update', this.changeConstructor);
  }

  /** Respond to new data on a ref. */
  onCreate(
    handler: (
      snapshot: DataSnapshot,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<DataSnapshot> {
    const dataConstructor = (raw: Event) => {
      const [dbInstance, path] = resourceToInstanceAndPath(
        raw.context.resource.name
      );
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
  onDelete(
    handler: (
      snapshot: DataSnapshot,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<DataSnapshot> {
    const dataConstructor = (raw: Event) => {
      const [dbInstance, path] = resourceToInstanceAndPath(
        raw.context.resource.name
      );
      return new DataSnapshot(raw.data.data, path, this.apps.admin, dbInstance);
    };
    return this.onOperation(handler, 'ref.delete', dataConstructor);
  }

  private onOperation<T>(
    handler: (data: T, context: EventContext) => PromiseLike<any> | any,
    eventType: string,
    dataConstructor: (raw: Event | Event) => any
  ): CloudFunction<T> {
    return makeCloudFunction({
      handler,
      provider,
      service,
      eventType,
      legacyEventType: `providers/${provider}/eventTypes/${eventType}`,
      triggerResource: this.triggerResource,
      dataConstructor,
      before: (event) => this.apps.retain(),
      after: (event) => this.apps.release(),
      options: this.options,
    });
  }

  private changeConstructor = (raw: Event): Change<DataSnapshot> => {
    const [dbInstance, path] = resourceToInstanceAndPath(
      raw.context.resource.name
    );
    const before = new DataSnapshot(
      raw.data.data,
      path,
      this.apps.admin,
      dbInstance
    );
    const after = new DataSnapshot(
      applyChange(raw.data.data, raw.data.delta),
      path,
      this.apps.admin,
      dbInstance
    );
    return {
      before,
      after,
    };
  };
}

/* Utility function to extract database reference from resource string */
/** @hidden */
export function resourceToInstanceAndPath(resource: string) {
  const resourceRegex = `projects/([^/]+)/instances/([a-zA-Z0-9\-^/]+)/refs(/.+)?`;
  const match = resource.match(new RegExp(resourceRegex));
  if (!match) {
    throw new Error(
      `Unexpected resource string for Firebase Realtime Database event: ${resource}. ` +
        'Expected string in the format of "projects/_/instances/{firebaseioSubdomain}/refs/{ref=**}"'
    );
  }
  const [, project, dbInstanceName, path] = match;
  if (project !== '_') {
    throw new Error(
      `Expect project to be '_' in a Firebase Realtime Database event`
    );
  }
  const dbInstance = 'https://' + dbInstanceName + '.firebaseio.com';
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
    instance?: string
  ) {
    if (instance) {
      // SDK always supplies instance, but user's unit tests may not
      this.instance = instance;
    } else if (app) {
      this.instance = app.options.databaseURL;
    } else if (process.env.GCLOUD_PROJECT) {
      this.instance =
        'https://' + process.env.GCLOUD_PROJECT + '.firebaseio.com';
    }

    this._path = path;
    this._data = data;
  }

  /** Ref returns a reference to the database with full admin access. */
  get ref(): firebase.database.Reference {
    if (!this.app) {
      // may be unpopulated in user's unit tests
      throw new Error(
        'Please supply a Firebase app in the constructor for DataSnapshot' +
          ' in order to use the .ref method.'
      );
    }
    if (!this._ref) {
      this._ref = this.app.database(this.instance).ref(this._fullPath());
    }
    return this._ref;
  }

  get key(): string {
    const last = _.last(pathParts(this._fullPath()));
    return !last || last === '' ? null : last;
  }

  val(): any {
    const parts = pathParts(this._childPath);
    const source = this._data;
    const node = _.cloneDeep(
      parts.length ? _.get(source, parts, null) : source
    );
    return this._checkAndConvertToArray(node);
  }

  // TODO(inlined): figure out what to do here
  exportVal(): any {
    return this.val();
  }

  // TODO(inlined): figure out what to do here
  getPriority(): string | number | null {
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
    const val = this.val();
    if (_.isPlainObject(val)) {
      return _.some(
        val,
        (value, key: string) => action(this.child(key)) === true
      );
    }
    return false;
  }

  hasChild(childPath: string): boolean {
    return this.child(childPath).exists();
  }

  hasChildren(): boolean {
    const val = this.val();
    return _.isPlainObject(val) && _.keys(val).length > 0;
  }

  numChildren(): number {
    const val = this.val();
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
    const obj: any = {};
    let numKeys = 0;
    let maxKey = 0;
    let allIntegerKeys = true;
    for (const key in node) {
      if (!node.hasOwnProperty(key)) {
        continue;
      }
      const childNode = node[key];
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
      const array: any = [];
      _.forOwn(obj, (val, key) => {
        array[key] = val;
      });

      return array;
    }
    return obj;
  }

  private _dup(childPath?: string): DataSnapshot {
    const dup = new DataSnapshot(
      this._data,
      undefined,
      this.app,
      this.instance
    );
    [dup._path, dup._childPath] = [this._path, this._childPath];

    if (childPath) {
      dup._childPath = joinPath(dup._childPath, childPath);
    }

    return dup;
  }

  private _fullPath(): string {
    const out = (this._path || '') + '/' + (this._childPath || '');
    return out;
  }
}
