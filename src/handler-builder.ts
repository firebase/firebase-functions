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

import * as express from 'express';

import { apps } from './apps';
import { CloudFunction, EventContext, HttpsFunction } from './cloud-functions';
import * as analytics from './providers/analytics';
import * as auth from './providers/auth';
import * as crashlytics from './providers/crashlytics';
import * as database from './providers/database';
import * as firestore from './providers/firestore';
import * as https from './providers/https';
import * as pubsub from './providers/pubsub';
import * as remoteConfig from './providers/remoteConfig';
import * as storage from './providers/storage';
import * as testLab from './providers/testLab';

/**
 * The `HandlerBuilder` class facilitates the writing of functions by developers
 * building Firebase Extensions as well as developers who want to use the gcloud CLI or
 * Google Cloud Console to deploy their functions.
 *
 * **Do not use `HandlerBuilder` when writing normal functions for deployment via
 * the Firebase CLI.** For normal purposes, use
 * [`FunctionBuilder`](/docs/reference/functions/function_builder_.functionbuilder).
 */
export class HandlerBuilder {
  constructor() {}

  /**
   * Create a handler for HTTPS events.
  
   * `onRequest` handles an HTTPS request and has the same signature as an Express app.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.https.onRequest((req, res) => { ... })
   * ```
   * 
   * `onCall` declares a callable function for clients to call using a Firebase SDK.
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.https.onCall((data, context) => { ... })
   * ```
   */
  get https() {
    return {
      onRequest: (
        handler: (req: express.Request, resp: express.Response) => void
      ): HttpsFunction => {
        const func = https._onRequestWithOptions(handler, {});
        func.__trigger = {};
        return func;
      },
      onCall: (
        handler: (
          data: any,
          context: https.CallableContext
        ) => any | Promise<any>
      ): HttpsFunction => {
        const func = https._onCallWithOptions(handler, {});
        func.__trigger = {};
        return func;
      },
    };
  }

  /**
   * Create a handler for Firebase Realtime Database events.
   * 
   * `ref.onCreate` handles the creation of new data.
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.database.ref.onCreate((snap, context) => { ... })
   * ```
   * 
   * `ref.onUpdate` handles updates to existing data.
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.database.ref.onUpdate((change, context) => { ... })
   * ```
  
   * `ref.onDelete` handles the deletion of existing data.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.database.ref.onDelete((snap, context) => { ... })
   * ```

   * `ref.onWrite` handles the creation, update, or deletion of data.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.database.ref.onWrite((change, context) => { ... })
   * ```
   */
  get database() {
    return {
      /** @hidden */
      get instance() {
        return {
          get ref() {
            return new database.RefBuilder(apps(), () => null, {});
          },
        };
      },
      get ref() {
        return new database.RefBuilder(apps(), () => null, {});
      },
    };
  }

  /**
   * Create a handler for Cloud Firestore events.
   * 
   * `document.onCreate` handles the creation of new documents.
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.firestore.document.onCreate((snap, context) => { ... })
   * ```
   
   * `document.onUpdate` handles updates to existing documents.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.firestore.document.onUpdate((change, context) => { ... })
   * ```
   
   * `document.onDelete` handles the deletion of existing documents.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.firestore.document.onDelete((snap, context) =>
   * { ... })
   * ```
   
   * `document.onWrite` handles the creation, update, or deletion of documents.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.firestore.document.onWrite((change, context) =>
   * { ... })
   * ```
   */
  get firestore() {
    return {
      get document() {
        return new firestore.DocumentBuilder(() => null, {});
      },
      /** @hidden */
      get namespace() {
        return new firestore.DocumentBuilder(() => null, {});
      },
      /** @hidden */
      get database() {
        return new firestore.DocumentBuilder(() => null, {});
      },
    };
  }

  /**
   * Create a handler for Firebase Crashlytics events.
  
   * `issue.onNew` handles events where the app experiences an issue for the first time.

   * @example
   * ```javascript
   * exports.myFunction = functions.handler.crashlytics.issue.onNew((issue) => { ... })
   * ```

   * `issue.onRegressed` handles events where an issue reoccurs after it
   * is closed in Crashlytics.
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.crashlytics.issue.onRegressed((issue) => { ... })
   * ```
   
   * `issue.onVelocityAlert` handles events where a statistically significant number
   * of sessions in a given build crash.
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.crashlytics.issue.onVelocityAlert((issue) => { ... })
   * ```

   */
  get crashlytics() {
    return {
      get issue() {
        return new crashlytics.IssueBuilder(() => null, {});
      },
    };
  }

  /**
   * Create a handler for Firebase Remote Config events.

   * `remoteConfig.onUpdate` handles events that update a Remote Config template.
 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.remoteConfig.onUpdate() => { ... })
   * ```
   */
  get remoteConfig() {
    return {
      onUpdate: (
        handler: (
          version: remoteConfig.TemplateVersion,
          context: EventContext
        ) => PromiseLike<any> | any
      ): CloudFunction<remoteConfig.TemplateVersion> => {
        return new remoteConfig.UpdateBuilder(() => null, {}).onUpdate(handler);
      },
    };
  }

  /**
   * Create a handler for Google Analytics events.
   
   * `event.onLog` handles the logging of Analytics conversion events.
 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.analytics.event.onLog((event) => { ... })
   * ```
   */
  get analytics() {
    return {
      get event() {
        return new analytics.AnalyticsEventBuilder(() => null, {});
      },
    };
  }

  /**
   * Create a handler for Cloud Storage for Firebase events.
   * 
   * `object.onArchive` handles the archiving of Storage objects.
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.storage.object.onArchive((object) => { ... })
   * ```
   
   * `object.onDelete` handles the deletion of Storage objects.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.storage.object.onDelete((object) => { ... })
   * ```
   
   * `object.onFinalize` handles the creation of Storage objects.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.storage.object.onFinalize((object) =>
   * { ... })
   * ```
   
   * `object.onMetadataUpdate` handles changes to the metadata of existing Storage objects.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.storage.object.onMetadataUpdate((object) =>
   * { ... })
   * ```
   */
  get storage() {
    return {
      get bucket() {
        return new storage.BucketBuilder(() => null, {}).object();
      },

      get object() {
        return new storage.ObjectBuilder(() => null, {});
      },
    };
  }

  /**
   * Create a handler for Cloud Pub/Sub events.
   * 
   * `topic.onPublish` handles messages published to a Pub/Sub topic from SDKs, Cloud Console, or gcloud CLI. 
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.pubsub.topic.onPublish((message) => { ... })
   * ```
   
   * `schedule.onPublish` handles messages published to a Pub/Sub topic on a schedule.
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.pubsub.schedule.onPublish((message) => { ... })
   * ```
   */
  get pubsub() {
    return {
      get topic() {
        return new pubsub.TopicBuilder(() => null, {});
      },
      get schedule() {
        return new pubsub.ScheduleBuilder(() => null, {});
      },
    };
  }

  /**
   * Create a handler for Firebase Authentication events.
   * 
   * `user.onCreate` handles the creation of users.
   * 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.auth.user.onCreate((user) => { ... })
   * ```
   
   * `user.onDelete` handles the deletion of users.
   *
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.auth.user.onDelete((user => { ... })
   * ```
   
   */
  get auth() {
    return {
      get user() {
        return new auth.UserBuilder(() => null, {});
      },
    };
  }

  /**
   * Create a handler for Firebase Test Lab events.

   * `testMatrix.onComplete` handles the completion of a test matrix.
 
   * @example
   * ```javascript
   * exports.myFunction = functions.handler.testLab.testMatrix.onComplete((testMatrix) => { ... })
   * ```
   */
  get testLab() {
    return {
      get testMatrix() {
        return new testLab.TestMatrixBuilder(() => null, {});
      },
    };
  }
}

export let handler = new HandlerBuilder();
