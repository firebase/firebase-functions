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

// Providers:
import * as analytics from './providers/analytics';
import * as auth from './providers/auth';

import * as crashlytics from './providers/crashlytics';
import * as database from './providers/database';
import * as firestore from './providers/firestore';
import * as https from './providers/https';
import * as pubsub from './providers/pubsub';
import * as remoteConfig from './providers/remoteConfig';
import * as storage from './providers/storage';
import { firebaseConfig } from './config';

export {
  analytics,
  auth,
  crashlytics,
  database,
  firestore,
  https,
  pubsub,
  remoteConfig,
  storage,
};

// // Exported root types:
export * from './config';
export * from './cloud-functions';
export * from './function-builder';

// TEMPORARY WORKAROUND (BUG 63586213):
// Until the Cloud Functions builder can publish FIREBASE_CONFIG, automatically provide it on import based on what
// we can deduce.
if (!process.env.FIREBASE_CONFIG) {
  const cfg = firebaseConfig();
  if (cfg) {
    process.env.FIREBASE_CONFIG = JSON.stringify(cfg);
  } else if (process.env.GCLOUD_PROJECT) {
    console.warn(
      'Warning, estimating Firebase Config based on GCLOUD_PROJECT. Initializing firebase-admin may fail'
    );
    process.env.FIREBASE_CONFIG = JSON.stringify({
      databaseURL:
        `${process.env.DATABASE_URL}` ||
        `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
      storageBucket:
        `${process.env.STORAGE_BUCKET_URL}` ||
        `${process.env.GCLOUD_PROJECT}.appspot.com`,
      projectId: process.env.GCLOUD_PROJECT,
    });
  } else {
    console.warn(
      'Warning, FIREBASE_CONFIG environment variable is missing. Initializing firebase-admin will fail'
    );
  }
}
