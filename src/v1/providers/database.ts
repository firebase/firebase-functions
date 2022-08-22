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

import { getApp } from '../../common/app';
import { Change } from '../../common/change';
import { firebaseConfig } from '../../common/config';
import { DataSnapshot } from '../../common/providers/database';
import { normalizePath } from '../../common/utilities/path';
import { applyChange } from '../../common/utilities/utils';
import {
  CloudFunction,
  Event,
  EventContext,
  makeCloudFunction,
} from '../cloud-functions';
import { DeploymentOptions } from '../function-configuration';

export { DataSnapshot };

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

    let instance;
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

  return new RefBuilder(resourceGetter, options);
}

/**
 * The Firebase Realtime Database reference builder interface.
 *
 * Access via [`functions.database.ref()`](functions.database#.ref).
 */
export class RefBuilder {
  /** @hidden */
  constructor(
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
      return new DataSnapshot(raw.data.delta, path, getApp(), dbInstance);
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
      return new DataSnapshot(raw.data.data, path, getApp(), dbInstance);
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
      options: this.options,
    });
  }

  private changeConstructor = (raw: Event): Change<DataSnapshot> => {
    const [dbInstance, path] = extractInstanceAndPath(
      raw.context.resource.name,
      raw.context.domain
    );
    const before = new DataSnapshot(raw.data.data, path, getApp(), dbInstance);
    const after = new DataSnapshot(
      applyChange(raw.data.data, raw.data.delta),
      path,
      getApp(),
      dbInstance
    );
    return {
      before,
      after,
    };
  };
}

const resourceRegex =
  /^projects\/([^/]+)\/instances\/([a-zA-Z0-9-]+)\/refs(\/.+)?/;

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

  const emuHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  if (emuHost) {
    const dbInstance = `http://${emuHost}/?ns=${dbInstanceName}`;
    return [dbInstance, path];
  } else {
    const dbInstance = 'https://' + dbInstanceName + '.' + domain;
    return [dbInstance, path];
  }
}
