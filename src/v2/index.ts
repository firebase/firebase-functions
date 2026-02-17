// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
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

/**
 * The 2nd gen API for Cloud Functions for Firebase.
 * This SDK supports deep imports. For example, the namespace
 * `pubsub` is available at `firebase-functions/v2` or is directly importable
 * from `firebase-functions/v2/pubsub`.
 * @packageDocumentation
 */

import * as alerts from "./providers/alerts";
import * as database from "./providers/database";
import * as eventarc from "./providers/eventarc";
import * as https from "./providers/https";
import * as identity from "./providers/identity";
import * as pubsub from "./providers/pubsub";
import * as scheduler from "./providers/scheduler";
import * as storage from "./providers/storage";
import * as tasks from "./providers/tasks";
import * as remoteConfig from "./providers/remoteConfig";
import * as testLab from "./providers/testLab";
import * as firestore from "./providers/firestore";
import * as dataconnect from "./providers/dataconnect";

// We explicitly do not export the graphql provider here because it relies on optional peer dependencies.
// To avoid forcing developers who import from the top-level firebase-functions namespace to install these dependencies,
// we require developers who want to use the graphql provider to import directly from firebase-functions/dataconnect/graphql.
export {
  alerts,
  database,
  storage,
  https,
  identity,
  pubsub,
  tasks,
  eventarc,
  scheduler,
  remoteConfig,
  testLab,
  firestore,
  dataconnect,
};

export { logger } from "../logger";
export { setGlobalOptions } from "./options";
export type {
  GlobalOptions,
  SupportedRegion,
  MemoryOption,
  VpcEgressSetting,
  IngressSetting,
  EventHandlerOptions,
} from "./options";

export { onInit } from "./core";
export type { CloudFunction, CloudEvent, ParamsOf } from "./core";
export { Change } from "../common/change";
export { traceContext } from "../common/trace";
export type { PubSubCloudEvent } from "./compat";
// NOTE: Equivalent to `export * as params from "../params"` but api-extractor doesn't support that syntax.
import * as params from "../params";
export { params };

// NOTE: Required to support the Functions Emulator which monkey patches `functions.config()`
// TODO(danielylee): Remove in next major release.
export { config } from "../v1/config";

// Required for v1 Emulator support.
import { setApp as setEmulatedAdminApp } from "../common/app";
export const app = { setEmulatedAdminApp };
