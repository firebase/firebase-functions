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

import * as _ from 'lodash';
import * as express from 'express';

import * as analytics from './providers/analytics';
import * as auth from './providers/auth';
import * as crashlytics from './providers/crashlytics';
import * as database from './providers/database';
import * as firestore from './providers/firestore';
import * as https from './providers/https';
import * as pubsub from './providers/pubsub';
import * as remoteConfig from './providers/remoteConfig';
import * as storage from './providers/storage';
import { CloudFunction, EventContext, HttpsFunction } from './cloud-functions';

/** @internal */
export class HandlerBuilder {
  constructor() {}

  get crashlytics() {
    return {
      /**
       * Handle events related to Crashlytics issues. An issue in Crashlytics is an
       * aggregation of crashes which have a shared root cause.
       */
      issue: () => new crashlytics.IssueBuilder(() => null, {}),
    };
  }
}

export let handler = new HandlerBuilder();
