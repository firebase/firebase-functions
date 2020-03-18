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
 * The `HandlerBuilder` class facilitates the writing of functions by producers
 * of Firebase Extensions and developers that want to use gcloud CLI or 
 * Cloud Console to deploy their functions.
 *
 * **Do not use `HandlerBuilder` when writing normal functions for deployment
 * via Cloud Functions for Firebase.** For normal purposes,
 * use `FunctionBuilder`.
 */
export class HandlerBuilder {
  constructor() { }

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

  get database() {
    return {
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
  get crashlytics() {
    return {
      get issue() {
        return new crashlytics.IssueBuilder(() => null, {});
      },
    };
  }

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

  get analytics() {
    return {
      get event() {
        return new analytics.AnalyticsEventBuilder(() => null, {});
      },
    };
  }

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

  get auth() {
    return {
      get user() {
        return new auth.UserBuilder(() => null, {});
      },
    };
  }

  get testLab() {
    return {
      get testMatrix() {
        return new testLab.TestMatrixBuilder(() => null, {});
      },
    };
  }
}

export let handler = new HandlerBuilder();
