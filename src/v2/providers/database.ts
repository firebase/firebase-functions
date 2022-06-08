// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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

import { apps } from '../../apps';
import { Change } from '../../cloud-functions';
import { DataSnapshot } from '../../common/providers/database';
import { ManifestEndpoint } from '../../runtime/manifest';
import { normalizePath } from '../../utilities/path';
import { PathPattern } from '../../utilities/path-pattern';
import { applyChange } from '../../utils';
import { CloudEvent, CloudFunction } from '../core';
import * as options from '../options';

export { DataSnapshot };

/** @internal */
export const writtenEventType = 'google.firebase.database.ref.v1.written';

/** @internal */
export const createdEventType = 'google.firebase.database.ref.v1.created';

/** @internal */
export const updatedEventType = 'google.firebase.database.ref.v1.updated';

/** @internal */
export const deletedEventType = 'google.firebase.database.ref.v1.deleted';

/** @internal */
export interface RawRTDBCloudEventData {
  ['@type']: 'type.googleapis.com/google.events.firebase.database.v1.ReferenceEventData';
  data: any;
  delta: any;
}

/** @internal */
export interface RawRTDBCloudEvent extends CloudEvent<RawRTDBCloudEventData> {
  firebasedatabasehost: string;
  instance: string;
  ref: string;
  location: string;
}

/** A CloudEvent that contains a DataSnapshot or a Change<DataSnapshot> */
export interface DatabaseEvent<T> extends CloudEvent<T> {
  /** The domain of the database instance */
  firebaseDatabaseHost: string;
  /** The instance ID portion of the fully qualified resource name */
  instance: string;
  /** The database reference path */
  ref: string;
  /** The location of the database */
  location: string;
  /**
   * An object containing the values of the path patterns.
   * Only named capture groups will be populated - {key}, {key=*}, {key=**}
   */
  params: Record<string, string>;
}

/** ReferenceOptions extend EventHandlerOptions with provided ref and optional instance  */
export interface ReferenceOptions extends options.EventHandlerOptions {
  /**
   * Specify the handler to trigger on a database reference(s).
   * This value can either be a single reference or a pattern.
   * Examples: '/foo/bar', '/foo/{bar}'
   */
  ref: string;
  /**
   * Specify the handler to trigger on a database instance(s).
   * If present, this value can either be a single instance or a pattern.
   * Examples: 'my-instance-1', '{instance}'
   */
  instance?: string;
}

/**
 * Event handler which triggers when data is created, updated, or deleted in Realtime Database.
 *
 * @param reference - The database reference path to trigger on.
 * @param handler - Event handler which is run every time a Realtime Database create, update, or delete occurs.
 */
export function onRefWritten(
  reference: string,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;

/**
 * Event handler which triggers when data is created, updated, or deleted in Realtime Database.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Realtime Database create, update, or delete occurs.
 */
export function onRefWritten(
  opts: ReferenceOptions,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;

/**
 * Event handler which triggers when data is created, updated, or deleted in Realtime Database.
 *
 * @param referenceOrOpts - Options or a string reference.
 * @param handler - Event handler which is run every time a Realtime Database create, update, or delete occurs.
 */
export function onRefWritten(
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>> {
  return onChangedOperation(writtenEventType, referenceOrOpts, handler);
}

/**
 * Event handler which triggers when data is created in Realtime Database.
 *
 * @param reference - The database reference path to trigger on.
 * @param handler - Event handler which is run every time a Realtime Database create occurs.
 */
export function onRefCreated(
  reference: string,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>>;

/**
 * Event handler which triggers when data is created in Realtime Database.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Realtime Database create occurs.
 */
export function onRefCreated(
  opts: ReferenceOptions,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>>;

/**
 * Event handler which triggers when data is created in Realtime Database.
 *
 * @param referenceOrOpts - Options or a string reference.
 * @param handler - Event handler which is run every time a Realtime Database create occurs.
 */
export function onRefCreated(
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>> {
  return onOperation(createdEventType, referenceOrOpts, handler);
}

/**
 * Event handler which triggers when data is updated in Realtime Database.
 *
 * @param reference - The database reference path to trigger on.
 * @param handler - Event handler which is run every time a Realtime Database update occurs.
 */
export function onRefUpdated(
  reference: string,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;

/**
 * Event handler which triggers when data is updated in Realtime Database.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Realtime Database update occurs.
 */
export function onRefUpdated(
  opts: ReferenceOptions,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>>;

/**
 * Event handler which triggers when data is updated in Realtime Database.
 *
 * @param referenceOrOpts - Options or a string reference.
 * @param handler - Event handler which is run every time a Realtime Database update occurs.
 */
export function onRefUpdated(
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>> {
  return onChangedOperation(updatedEventType, referenceOrOpts, handler);
}

/**
 * Event handler which triggers when data is deleted in Realtime Database.
 *
 * @param reference - The database reference path to trigger on.
 * @param handler - Event handler which is run every time a Realtime Database deletion occurs.
 */
export function onRefDeleted(
  reference: string,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>>;

/**
 * Event handler which triggers when data is deleted in Realtime Database.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Realtime Database deletion occurs.
 */
export function onRefDeleted(
  opts: ReferenceOptions,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>>;

/**
 * Event handler which triggers when data is deleted in Realtime Database.
 *
 * @param referenceOrOpts - Options or a string reference.
 * @param handler - Event handler which is run every time a Realtime Database deletion occurs.
 */
export function onRefDeleted(
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>> {
  // TODO - need to use event.data.delta
  return onOperation(deletedEventType, referenceOrOpts, handler);
}

/** @internal */
export function getOpts(referenceOrOpts: string | ReferenceOptions) {
  let path: string, instance: string, opts: options.EventHandlerOptions;
  if (typeof referenceOrOpts === 'string') {
    path = normalizePath(referenceOrOpts);
    instance = '*';
    opts = {};
  } else {
    path = normalizePath(referenceOrOpts.ref);
    instance = referenceOrOpts.instance || '*';
    opts = { ...referenceOrOpts };
    delete (opts as any).ref;
    delete (opts as any).instance;
  }

  return {
    path,
    instance,
    opts,
  };
}

/** @internal */
export function makeParams(
  event: RawRTDBCloudEvent,
  path: PathPattern,
  instance: PathPattern
) {
  return {
    ...path.extractMatches(event.ref),
    ...instance.extractMatches(event.instance),
  };
}

/** @hidden */
function makeDatabaseEvent(
  event: RawRTDBCloudEvent,
  data: any,
  instance: string,
  params: Record<string, string>
): DatabaseEvent<DataSnapshot> {
  const snapshot = new DataSnapshot(data, event.ref, apps().admin, instance);
  const databaseEvent: DatabaseEvent<DataSnapshot> = {
    ...event,
    firebaseDatabaseHost: event.firebasedatabasehost,
    data: snapshot,
    params,
  };
  delete (databaseEvent as any).firebasedatabasehost;
  return databaseEvent;
}

/** @hidden */
function makeChangedDatabaseEvent(
  event: RawRTDBCloudEvent,
  instance: string,
  params: Record<string, string>
): DatabaseEvent<Change<DataSnapshot>> {
  const before = new DataSnapshot(
    event.data.data,
    event.ref,
    apps().admin,
    instance
  );
  const after = new DataSnapshot(
    applyChange(event.data.data, event.data.delta),
    event.ref,
    apps().admin,
    instance
  );
  const databaseEvent: DatabaseEvent<Change<DataSnapshot>> = {
    ...event,
    firebaseDatabaseHost: event.firebasedatabasehost,
    data: {
      before,
      after,
    },
    params,
  };
  delete (databaseEvent as any).firebasedatabasehost;
  return databaseEvent;
}

/** @internal */
export function makeEndpoint(
  eventType: string,
  opts: options.EventHandlerOptions,
  path: PathPattern,
  instance: PathPattern
): ManifestEndpoint {
  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts);

  const eventFilters: Record<string, string> = {};
  const eventFilterPathPatterns: Record<string, string> = {
    // Note: Eventarc always treats ref as a path pattern
    ref: path.getValue(),
  };
  instance.hasWildcards()
    ? (eventFilterPathPatterns.instance = instance.getValue())
    : (eventFilters.instance = instance.getValue());

  return {
    platform: 'gcfv2',
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType,
      eventFilters,
      eventFilterPathPatterns,
      retry: false,
    },
  };
}

/** @internal */
export function onChangedOperation(
  eventType: string,
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<Change<DataSnapshot>>) => any | Promise<any>
): CloudFunction<DatabaseEvent<Change<DataSnapshot>>> {
  const { path, instance, opts } = getOpts(referenceOrOpts);

  const pathPattern = new PathPattern(path);
  const instancePattern = new PathPattern(instance);

  // wrap the handler
  const func = (raw: CloudEvent<unknown>) => {
    const event = raw as RawRTDBCloudEvent;
    const instanceUrl = `https://${event.instance}.${event.firebasedatabasehost}`;
    const params = makeParams(event, pathPattern, instancePattern);
    const databaseEvent = makeChangedDatabaseEvent(event, instanceUrl, params);
    return handler(databaseEvent);
  };

  func.run = handler;

  func.__endpoint = makeEndpoint(eventType, opts, pathPattern, instancePattern);

  return func;
}

/** @internal */
export function onOperation(
  eventType: string,
  referenceOrOpts: string | ReferenceOptions,
  handler: (event: DatabaseEvent<DataSnapshot>) => any | Promise<any>
): CloudFunction<DatabaseEvent<DataSnapshot>> {
  const { path, instance, opts } = getOpts(referenceOrOpts);

  const pathPattern = new PathPattern(path);
  const instancePattern = new PathPattern(instance);

  // wrap the handler
  const func = (raw: CloudEvent<unknown>) => {
    const event = raw as RawRTDBCloudEvent;
    const instanceUrl = `https://${event.instance}.${event.firebasedatabasehost}`;
    const params = makeParams(event, pathPattern, instancePattern);
    const data =
      eventType === deletedEventType ? event.data.data : event.data.delta;
    const databaseEvent = makeDatabaseEvent(event, data, instanceUrl, params);
    return handler(databaseEvent);
  };

  func.run = handler;

  func.__endpoint = makeEndpoint(eventType, opts, pathPattern, instancePattern);

  return func;
}
