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

import { withInit } from "../../common/onInit";
import { initV2Endpoint, type ManifestEndpoint } from "../../runtime/manifest";
import type { CloudEvent, CloudFunction } from "../core";
import { type EventHandlerOptions, getGlobalOptions, optionsToEndpoint } from "../options";
import { wrapTraceContext } from "../trace";

/** @internal */
export const eventType = "google.firebase.remoteconfig.remoteConfig.v1.updated";

/** All the fields associated with the person/service account that wrote a Remote Config template. */
export interface ConfigUser {
  /** Display name. */
  name: string;

  /** Email address. */
  email: string;

  /** Image URL. */
  imageUrl: string;
}

/** What type of update was associated with the Remote Config template version. */
export type ConfigUpdateOrigin =
  /** Catch-all for unrecognized values. */
  | "REMOTE_CONFIG_UPDATE_ORIGIN_UNSPECIFIED"
  /** The update came from the Firebase UI. */
  | "CONSOLE"
  /** The update came from the Remote Config REST API. */
  | "REST_API"
  /** The update came from the Firebase Admin Node SDK. */
  | "ADMIN_SDK_NODE";

/** Where the Remote Config update action originated. */
export type ConfigUpdateType =
  /** Catch-all for unrecognized enum values */
  | "REMOTE_CONFIG_UPDATE_TYPE_UNSPECIFIED"
  /** A regular incremental update */
  | "INCREMENTAL_UPDATE"
  /** A forced update. The ETag was specified as "*" in an UpdateRemoteConfigRequest request or the "Force Update" button was pressed on the console */
  | "FORCED_UPDATE"
  /** A rollback to a previous Remote Config template */
  | "ROLLBACK";

/** The data within Firebase Remote Config update events. */
export interface ConfigUpdateData {
  /** The version number of the version's corresponding Remote Config template. */
  versionNumber: number;

  /** When the Remote Config template was written to the Remote Config server. */
  updateTime: string;

  /** Aggregation of all metadata fields about the account that performed the update. */
  updateUser: ConfigUser;

  /** The user-provided description of the corresponding Remote Config template. */
  description: string;

  /** Where the update action originated. */
  updateOrigin: ConfigUpdateOrigin;

  /** What type of update was made. */
  updateType: ConfigUpdateType;

  /** Only present if this version is the result of a rollback, and will be the version number of the Remote Config template that was rolled-back to. */
  rollbackSource: number;
}

/**
 * Event handler which triggers when data is updated in a Remote Config.
 *
 * @param handler - Event handler which is run every time a Remote Config update occurs.
 * @returns A function that you can export and deploy.
 */
export function onConfigUpdated(
  handler: (event: CloudEvent<ConfigUpdateData>) => any | Promise<any>
): CloudFunction<CloudEvent<ConfigUpdateData>>;

/**
 * Event handler which triggers when data is updated in a Remote Config.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Remote Config update occurs.
 * @returns A function that you can export and deploy.
 */
export function onConfigUpdated(
  opts: EventHandlerOptions,
  handler: (event: CloudEvent<ConfigUpdateData>) => any | Promise<any>
): CloudFunction<CloudEvent<ConfigUpdateData>>;

/**
 * Event handler which triggers when data is updated in a Remote Config.
 *
 * @param optsOrHandler - Options or an event handler.
 * @param handler - Event handler which is run every time a Remote Config update occurs.
 * @returns A function that you can export and deploy.
 */
export function onConfigUpdated(
  optsOrHandler:
    | EventHandlerOptions
    | ((event: CloudEvent<ConfigUpdateData>) => any | Promise<any>),
  handler?: (event: CloudEvent<ConfigUpdateData>) => any | Promise<any>
): CloudFunction<CloudEvent<ConfigUpdateData>> {
  if (typeof optsOrHandler === "function") {
    handler = optsOrHandler as (event: CloudEvent<ConfigUpdateData>) => any | Promise<any>;
    optsOrHandler = {};
  }

  const baseOpts = optionsToEndpoint(getGlobalOptions());
  const specificOpts = optionsToEndpoint(optsOrHandler);

  const func: any = wrapTraceContext(
    withInit((raw: CloudEvent<unknown>) => {
      return handler(raw as CloudEvent<ConfigUpdateData>);
    })
  );
  func.run = handler;

  const ep: ManifestEndpoint = {
    ...initV2Endpoint(getGlobalOptions(), optsOrHandler),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType,
      eventFilters: {},
      retry: optsOrHandler.retry ?? false,
    },
  };
  func.__endpoint = ep;

  return func;
}
