// The MIT License (MIT)
//
// Copyright (c) 2025 Firebase
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

import { CloudEvent, CloudFunction } from "../core";
import { ParamsOf, VarName } from "../../common/params";
import { EventHandlerOptions, getGlobalOptions, optionsToEndpoint } from "../options";
import { normalizePath } from "../../common/utilities/path";
import { wrapTraceContext } from "../trace";
import { withInit } from "../../common/onInit";
import { initV2Endpoint, ManifestEndpoint } from "../../runtime/manifest";
import { PathPattern } from "../../common/utilities/path-pattern";

/** @internal */
export const mutationExecutedEventType =
  "google.firebase.dataconnect.connector.v1.mutationExecuted";

/** @hidden */
export interface SourceLocation {
  line: number;
  column: number;
}

/** @hidden */
export interface GraphqlErrorExtensions {
  file: string;
  code: string;
  debugDetails: string;
}

/** @hidden */
export interface GraphqlError {
  message: string;
  locations: Array<SourceLocation>;
  path: Array<string>;
  extensions: GraphqlErrorExtensions;
}

/** @hidden */
export interface RawMutation<V, R> {
  data: R;
  variables: V;
  errors: Array<GraphqlError>;
}

/** @hidden */
export interface MutationEventData<V, R> {
  ["@type"]: "type.googleapis.com/google.events.firebase.dataconnect.v1.MutationEventData";
  payload: RawMutation<V, R>;
}

/** @hidden */
export interface RawDataConnectEvent<T> extends CloudEvent<T> {
  project: string;
  location: string;
  service: string;
  schema: string;
  connector: string;
  operation: string;
  authtype: AuthType;
  authid?: string;
}

/**
 * AuthType defines the possible values for the authType field in a Firebase Data Connect event.
 * - app_user: an end user of an application..
 * - admin: an admin user of an application. In the context of impersonate endpoints used by the admin SDK, the impersonator.
 * - unknown: a general type to capture all other principals not captured in the other auth types.
 */
export type AuthType = "app_user" | "admin" | "unknown";

/** OperationOptions extend EventHandlerOptions with a provided service, connector, and operation. */
export interface OperationOptions<Service extends string = string, Connector extends string = string, Operation extends string = string> extends EventHandlerOptions{
    /** Firebase Data Connect service ID */
    service?: Service;
    /** Firebase Data Connect connector ID */
    connector?: Connector;
    /** Name of the operation */
    operation?: Operation;
}

export type DataConnectParams<PathPatternOrOptions extends string | OperationOptions> =
    PathPatternOrOptions extends string
    ? ParamsOf<PathPatternOrOptions>
    : PathPatternOrOptions extends OperationOptions<infer Service extends string, infer Connector extends string, infer Operation extends string>
    ? Record<VarName<Service> | VarName<Connector> | VarName<Operation>, string>
    : never;

export interface DataConnectEvent<T, Params extends Record<never, string>> extends CloudEvent<T> {
  /** The location of the Firebase Data Connect instance */
  location: string;
  /** The project identifier */
  project: string;
  /**
   * An object containing the values of the path patterns.
   * Only named capture groups will be populated - {key}, {key=*}, {key=**}.
   */
  params: Params;
  /** The type of principal that triggered the event */
  authType: AuthType;
  /** The unique identifier for the principal */
  authId?: string;
}

/**
 * Event handler that triggers when a mutation is executed in Firebase Data Connect.
 *
 * @param mutation - The mutation path to trigger on.
 * @param handler - Event handler which is run every time a mutation is executed.
 */
export function onMutationExecuted<
  Mutation extends string,
  Variables = unknown,
  ResponseData = unknown
>(
  mutation: Mutation,
  handler: (
    event: DataConnectEvent<MutationEventData<Variables, ResponseData>, DataConnectParams<Mutation>>
  ) => unknown | Promise<unknown>
): CloudFunction<DataConnectEvent<MutationEventData<Variables, ResponseData>, DataConnectParams<Mutation>>>;

/**
 * Event handler that triggers when a mutation is executed in Firebase Data Connect.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a mutation is executed.
 */
export function onMutationExecuted<
  Options extends OperationOptions,
  Variables = unknown,
  ResponseData = unknown
>(
  opts: Options,
  handler: (
    event: DataConnectEvent<MutationEventData<Variables, ResponseData>, DataConnectParams<Options>>
  ) => unknown | Promise<unknown>
): CloudFunction<DataConnectEvent<MutationEventData<Variables, ResponseData>, DataConnectParams<Options>>>;

/**
 * Event handler that triggers when a mutation is executed in Firebase Data Connect.
 *
 * @param mutationOrOpts - Options or string mutation path.
 * @param handler - Event handler which is run every time a mutation is executed.
 */
export function onMutationExecuted<
  PathPatternOrOptions extends string | OperationOptions<string, string, string>,
  Variables = unknown,
  ResponseData = unknown
>(
  mutationOrOpts: PathPatternOrOptions,
  handler: (
    event: DataConnectEvent<MutationEventData<Variables, ResponseData>, DataConnectParams<PathPatternOrOptions>>
  ) => unknown | Promise<unknown>
): CloudFunction<DataConnectEvent<MutationEventData<Variables, ResponseData>, DataConnectParams<PathPatternOrOptions>>> {
  return onOperation<Variables, ResponseData, PathPatternOrOptions>(mutationExecutedEventType, mutationOrOpts, handler);
}

function getOpts(mutationOrOpts: string | OperationOptions) {
  const operationRegex = new RegExp("services/([^/]+)/connectors/([^/]+)/operations/([^/]+)");

  let service: string;
  let connector: string;
  let operation: string;
  let opts: EventHandlerOptions;
  if (typeof mutationOrOpts === "string") {
    const path = normalizePath(mutationOrOpts);
    const match = path.match(operationRegex);
    if (!match) {
      throw new Error(`Invalid operation path: ${path}`);
    }

    service = match[1];
    connector = match[2];
    operation = match[3];
    opts = {};
  } else {
    service = mutationOrOpts.service;
    connector = mutationOrOpts.connector;
    operation = mutationOrOpts.operation;
    opts = { ...mutationOrOpts };

    delete (opts as any).service;
    delete (opts as any).connector;
    delete (opts as any).operation;
  }

  return {
    service,
    connector,
    operation,
    opts,
  };
}

function makeEndpoint(
  eventType: string,
  opts: EventHandlerOptions,
  service: PathPattern,
  connector: PathPattern,
  operation: PathPattern
): ManifestEndpoint {
  const baseOpts = optionsToEndpoint(getGlobalOptions());
  const specificOpts = optionsToEndpoint(opts);

  const eventFilters: Record<string, string> = {};
  const eventFilterPathPatterns: Record<string, string> = {};

  service.hasWildcards()
    ? (eventFilterPathPatterns.service = service.getValue())
    : (eventFilters.service = service.getValue());
  connector.hasWildcards()
    ? (eventFilterPathPatterns.connector = connector.getValue())
    : (eventFilters.connector = connector.getValue());
  operation.hasWildcards()
    ? (eventFilterPathPatterns.operation = operation.getValue())
    : (eventFilters.operation = operation.getValue());

  return {
    ...initV2Endpoint(getGlobalOptions(), opts),
    platform: "gcfv2",
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
      retry: opts.retry ?? false,
    },
  };
}

function makeParams<V, R>(
  event: RawDataConnectEvent<MutationEventData<V, R>>,
  service: PathPattern,
  connector: PathPattern,
  operation: PathPattern
) {
  return {
    ...service.extractMatches(event.service),
    ...connector.extractMatches(event.connector),
    ...operation.extractMatches(event.operation),
  };
}

function onOperation<Variables, ResponseData, PathPatternOrOptions>(
  eventType: string,
  mutationOrOpts: PathPatternOrOptions,
  handler: (event: DataConnectEvent<MutationEventData<Variables, ResponseData>, DataConnectParams<PathPatternOrOptions>>) => any | Promise<any>
): CloudFunction<DataConnectEvent<MutationEventData<Variables, ResponseData>, DataConnectParams<PathPatternOrOptions>>> {
  const { service, connector, operation, opts } = getOpts(mutationOrOpts);

  const servicePattern = new PathPattern(service);
  const connectorPattern = new PathPattern(connector);
  const operationPattern = new PathPattern(operation);

  // wrap the handler
  const func = (raw: CloudEvent<unknown>) => {
    const event = raw as RawDataConnectEvent<MutationEventData<Variables, ResponseData>>;
    const params = makeParams<Variables, ResponseData>(event, servicePattern, connectorPattern, operationPattern);

    const dataConnectEvent: DataConnectEvent<MutationEventData<Variables, ResponseData>, DataConnectParams<PathPatternOrOptions>> = {
      ...event,
      authType: event.authtype,
      authId: event.authid,
      params: params as DataConnectParams<PathPatternOrOptions>,
    };
    delete (dataConnectEvent as any).authtype;
    delete (dataConnectEvent as any).authid;

    return wrapTraceContext(withInit(handler))(dataConnectEvent);
  };

  func.run = handler;

  func.__endpoint = makeEndpoint(
    eventType,
    opts,
    servicePattern,
    connectorPattern,
    operationPattern
  );

  return func;
}
