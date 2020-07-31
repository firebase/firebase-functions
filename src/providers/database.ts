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
import { joinPath, normalizePath, pathParts } from '../utilities/path';
import { applyChange } from '../utils';

/** @hidden */
export const provider = 'google.firebase.database';
/** @hidden */
export const service = 'firebaseio.com';

const databaseURLRegex = new RegExp('^https://([^.]+).');
const emulatorDatabaseURLRegex = new RegExp('^http://.*ns=([^&]+)');

/**
 * Registers a function that triggers on events from a specific
 * Firebase Realtime Database instance.
 *
 * Use this method together with `ref` to specify the instance on which to
 * watch for database events. For example: `firebase.database.instance('my-app-db-2').ref('/foo/bar')`
 *
 * Note that `functions.database.ref` used without `instance` watches the
 * *default* instance for events.
 *
 * @param instance The instance name of the database instance
 *   to watch for write events.
 * @return Firebase Realtime Database instance builder interface.
 */
export function instance(instance: string) {
  return _instanceWithOptions(instance, {});
}

/**
 * Registers a function that triggers on Firebase Realtime Database write
 * events.
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
 *    of the [`EventContext.params`](cloud_functions_eventcontext.html#params object. For
 *    example, `ref("messages/{messageId}")` matches changes at
 *    `/messages/message1` or `/messages/message2`, resulting in
 *    `event.params.messageId` being set to `"message1"` or `"message2"`,
 *    respectively.
 * 2. Cloud Functions do not fire an event for data that already existed before
 *    the Cloud Function was deployed.
 * 3. Cloud Function events have access to more information, including a
 *    snapshot of the previous event data and information about the user who
 *    triggered the Cloud Function.
 *
 * @param path The path within the Database to watch for write events.
 * @return Firebase Realtime Database builder interface.
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

/**
 * The Firebase Realtime Database instance builder interface.
 *
 * Access via [`database.instance()`](providers_database_.html#instance).
 */
export class InstanceBuilder {
  /** @hidden */
  constructor(private instance: string, private options: DeploymentOptions) {}

  /**
   * @return Firebase Realtime Database reference builder interface.
   */
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

    let instance = undefined;
    const prodMatch = databaseURL.match(databaseURLRegex);
    if (prodMatch) {
      instance = prodMatch[1];
    } else {
      const emulatorMatch = databaseURL.match(emulatorDatabaseURLRegex);
      if (emulatorMatch) {
        instance = emulatorMatch[1];
      }
    }

    if (!instance) {
      throw new Error(
        'Invalid value for config firebase.databaseURL: ' + databaseURL
      );
    }

    return `projects/_/instances/${instance}/refs/${normalized}`;
  };

  return new RefBuilder(apps(), resourceGetter, options);
}

/**
 * The Firebase Realtime Database reference builder interface.
 *
 * Access via [`functions.database.ref()`](functions.database#.ref).
 */
export class RefBuilder {
  /** @hidden */
  constructor(
    private apps: apps.Apps,
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {}

  /**
   * Event handler that fires every time a Firebase Realtime Database write
   * of any kind (creation, update, or delete) occurs.
   *
   * @param handler Event handler that runs every time a Firebase Realtime Database
   *   write occurs.
   * @return A Cloud Function that you can export and deploy.
   */
  onWrite(
    handler: (
      change: Change<DataSnapshot>,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<Change<DataSnapshot>> {
    return this.onOperation(handler, 'ref.write', this.changeConstructor);
  }

  /**
   * Event handler that fires every time data is updated in
   * Firebase Realtime Database.
   *
   * @param handler Event handler which is run every time a Firebase Realtime Database
   *   write occurs.
   * @return A Cloud
   *   Function which you can export and deploy.
   */
  onUpdate(
    handler: (
      change: Change<DataSnapshot>,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<Change<DataSnapshot>> {
    return this.onOperation(handler, 'ref.update', this.changeConstructor);
  }

  /**
   * Event handler that fires every time new data is created in
   * Firebase Realtime Database.
   *
   * @param handler Event handler that runs every time new data is created in
   *   Firebase Realtime Database.
   * @return A Cloud Function that you can export and deploy.
   */
  onCreate(
    handler: (
      snapshot: DataSnapshot,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<DataSnapshot> {
    const dataConstructor = (raw: Event) => {
      const [dbInstance, path] = extractInstanceAndPath(
        raw.context.resource.name,
        raw.context.domain
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

  /**
   * Event handler that fires every time data is deleted from
   * Firebase Realtime Database.
   *
   * @param handler Event handler that runs every time data is deleted from
   *   Firebase Realtime Database.
   * @return A Cloud Function that you can export and deploy.
   */
  onDelete(
    handler: (
      snapshot: DataSnapshot,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<DataSnapshot> {
    const dataConstructor = (raw: Event) => {
      const [dbInstance, path] = extractInstanceAndPath(
        raw.context.resource.name,
        raw.context.domain
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
    const [dbInstance, path] = extractInstanceAndPath(
      raw.context.resource.name,
      raw.context.domain
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

/**
 * Utility function to extract database reference from resource string
 *
 * @param optional database domain override for the original of the source database.
 *    It defaults to `firebaseio.com`.
 *    Multi-region RTDB will be served from different domains.
 *    Since region is not part of the resource name, it is provided through context.
 */
/** @hidden */
export function extractInstanceAndPath(
  resource: string,
  domain = 'firebaseio.com'
) {
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
  const dbInstance = 'https://' + dbInstanceName + '.' + domain;
  return [dbInstance, path];
}

/**
 * Interface representing a Firebase Realtime Database data snapshot.
 */
export class DataSnapshot {
  public instance: string;

  /** @hidden */
  private _ref: firebase.database.Reference;

  /** @hidden */
  private _path: string;

  /** @hidden */
  private _data: any;

  /** @hidden */
  private _childPath: string;

  constructor(
    data: any,
    path?: string, // path will be undefined for the database root
    private app?: firebase.app.App,
    instance?: string
  ) {
    if (app && app.options.databaseURL.startsWith('http:')) {
      // In this case we're dealing with an emulator
      this.instance = app.options.databaseURL;
    } else if (instance) {
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

  /**
   * Returns a [`Reference`](/docs/reference/admin/node/admin.database.Reference)
   * to the Database location where the triggering write occurred. Has
   * full read and write access.
   */
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

  /**
   * The key (last part of the path) of the location of this `DataSnapshot`.
   *
   * The last token in a Database location is considered its key. For example,
   * "ada" is the key for the `/users/ada/` node. Accessing the key on any
   * `DataSnapshot` will return the key for the location that generated it.
   * However, accessing the key on the root URL of a Database will return `null`.
   */
  get key(): string {
    const last = _.last(pathParts(this._fullPath()));
    return !last || last === '' ? null : last;
  }

  /**
   * Extracts a JavaScript value from a `DataSnapshot`.
   *
   * Depending on the data in a `DataSnapshot`, the `val()` method may return a
   * scalar type (string, number, or boolean), an array, or an object. It may also
   * return `null`, indicating that the `DataSnapshot` is empty (contains no
   * data).
   *
   * @return The DataSnapshot's contents as a JavaScript value (Object,
   *   Array, string, number, boolean, or `null`).
   */
  val(): any {
    const parts = pathParts(this._childPath);
    const source = this._data;
    const node = _.cloneDeep(
      parts.length ? _.get(source, parts, null) : source
    );
    return this._checkAndConvertToArray(node);
  }

  /**
   * Exports the entire contents of the `DataSnapshot` as a JavaScript object.
   *
   * The `exportVal()` method is similar to `val()`, except priority information
   * is included (if available), making it suitable for backing up your data.
   *
   * @return The contents of the `DataSnapshot` as a JavaScript value
   *   (Object, Array, string, number, boolean, or `null`).
   */
  exportVal(): any {
    return this.val();
  }

  /**
   * Gets the priority value of the data in this `DataSnapshot`.
   *
   * As an alternative to using priority, applications can order collections by
   * ordinary properties. See [Sorting and filtering
   * data](/docs/database/web/lists-of-data#sorting_and_filtering_data).
   *
   * @return The priority value of the data.
   */
  getPriority(): string | number | null {
    return 0;
  }

  /**
   * Returns `true` if this `DataSnapshot` contains any data. It is slightly more
   * efficient than using `snapshot.val() !== null`.
   *
   * @return `true` if this `DataSnapshot` contains any data; otherwise, `false`.
   */
  exists(): boolean {
    return !_.isNull(this.val());
  }

  /**
   * Gets a `DataSnapshot` for the location at the specified relative path.
   *
   * The relative path can either be a simple child name (for example, "ada") or
   * a deeper slash-separated path (for example, "ada/name/first").
   *
   * @param path A relative path from this location to the desired child
   *   location.
   * @return The specified child location.
   */
  child(childPath: string): DataSnapshot {
    if (!childPath) {
      return this;
    }
    return this._dup(childPath);
  }

  /**
   * Enumerates the `DataSnapshot`s of the children items.
   *
   * Because of the way JavaScript objects work, the ordering of data in the
   * JavaScript object returned by `val()` is not guaranteed to match the ordering
   * on the server nor the ordering of `child_added` events. That is where
   * `forEach()` comes in handy. It guarantees the children of a `DataSnapshot`
   * will be iterated in their query order.
   *
   * If no explicit `orderBy*()` method is used, results are returned
   * ordered by key (unless priorities are used, in which case, results are
   * returned by priority).
   *
   * @param action A function that will be called for each child `DataSnapshot`.
   *   The callback can return `true` to cancel further enumeration.
   *
   * @return `true` if enumeration was canceled due to your callback
   *   returning `true`.
   */
  forEach(action: (a: DataSnapshot) => boolean | void): boolean {
    const val = this.val();
    if (_.isPlainObject(val)) {
      return _.some(
        val,
        (value, key: string) => action(this.child(key)) === true
      );
    }
    return false;
  }

  /**
   * Returns `true` if the specified child path has (non-`null`) data.
   *
   * @param path A relative path to the location of a potential child.
   * @return `true` if data exists at the specified child path; otherwise,
   *   `false`.
   */
  hasChild(childPath: string): boolean {
    return this.child(childPath).exists();
  }

  /**
   * Returns whether or not the `DataSnapshot` has any non-`null` child
   * properties.
   *
   * You can use `hasChildren()` to determine if a `DataSnapshot` has any
   * children. If it does, you can enumerate them using `forEach()`. If it
   * doesn't, then either this snapshot contains a primitive value (which can be
   * retrieved with `val()`) or it is empty (in which case, `val()` will return
   * `null`).
   *
   * @return `true` if this snapshot has any children; else `false`.
   */
  hasChildren(): boolean {
    const val = this.val();
    return _.isPlainObject(val) && _.keys(val).length > 0;
  }

  /**
   * Returns the number of child properties of this `DataSnapshot`.
   *
   * @return Number of child properties of this `DataSnapshot`.
   */
  numChildren(): number {
    const val = this.val();
    return _.isPlainObject(val) ? Object.keys(val).length : 0;
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @return A JSON-serializable representation of this object.
   */
  toJSON(): Object {
    return this.val();
  }

  /** Recursive function to check if keys are numeric & convert node object to array if they are
   *
   * @hidden
   */
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

  /** @hidden */
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

  /** @hidden */
  private _fullPath(): string {
    const out = (this._path || '') + '/' + (this._childPath || '');
    return out;
  }
}
