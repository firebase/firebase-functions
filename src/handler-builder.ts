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

export class HandlerBuilder {
  constructor() {}

  get https() {
    return {
      /**
       * Handle HTTP requests.
       * @param handler A function that takes a request and response object,
       * same signature as an Express app.
       */
      onRequest: (
        handler: (req: express.Request, resp: express.Response) => void
      ): HttpsFunction => {
        const func = https._onRequestWithOpts(handler, {});
        func.__trigger = {};
        return func;
      },
      /**
       * Declares a callable method for clients to call using a Firebase SDK.
       * @param handler A method that takes a data and context and returns a value.
       */
      onCall: (
        handler: (
          data: any,
          context: https.CallableContext
        ) => any | Promise<any>
      ): HttpsFunction => {
        const func = https._onCallWithOpts(handler, {});
        func.__trigger = {};
        return func;
      },
    };
  }

  get database() {
    return {
      /**
       * Selects a database instance that will trigger the function.
       * If omitted, will pick the default database for your project.
       */
      get instance() {
        return {
          get ref() {
            return new database.RefBuilder(apps(), () => null, {});
          },
        };
      },

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
       */
      get ref() {
        return new database.RefBuilder(apps(), () => null, {});
      },
    };
  }

  get firestore() {
    return {
      /**
       * Listen for events on a Firestore document. A Firestore document contains a set of
       * key-value pairs and may contain subcollections and nested objects.
       */
      get document() {
        return new firestore.DocumentBuilder(() => null, {});
      },
      /** @internal */
      get namespace() {
        return new firestore.DocumentBuilder(() => null, {});
      },
      /** @internal */
      get database() {
        return new firestore.DocumentBuilder(() => null, {});
      },
    };
  }

  get crashlytics() {
    return {
      /**
       * Handle events related to Crashlytics issues. An issue in Crashlytics is an
       * aggregation of crashes which have a shared root cause.
       */
      get issue() {
        return new crashlytics.IssueBuilder(() => null, {});
      },
    };
  }

  get remoteConfig() {
    return {
      /**
       * Handle all updates (including rollbacks) that affect a Remote Config
       * project.
       * @param handler A function that takes the updated Remote Config template
       * version metadata as an argument.
       */
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

  get analytics() {
    return {
      /**
       * Select analytics events to listen to for events.
       */
      get event() {
        return new analytics.AnalyticsEventBuilder(() => null, {});
      },
    };
  }

  get storage() {
    return {
      /**
       * The optional bucket function allows you to choose which buckets' events to handle.
       * This step can be bypassed by calling object() directly, which will use the default
       * Cloud Storage for Firebase bucket.
       */
      get bucket() {
        return new storage.BucketBuilder(() => null, {}).object();
      },

      /**
       * Handle events related to Cloud Storage objects.
       */
      get object() {
        return new storage.ObjectBuilder(() => null, {});
      },
    };
  }

  get pubsub() {
    return {
      /**
       * Select Cloud Pub/Sub topic to listen to.
       */
      get topic() {
        return new pubsub.TopicBuilder(() => null, {});
      },
    };
  }

  get auth() {
    return {
      /**
       * Handle events related to Firebase authentication users.
       */
      get user() {
        return new auth.UserBuilder(() => null, {});
      },
    };
  }
}

export let handler = new HandlerBuilder();
