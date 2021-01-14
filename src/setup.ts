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

/** @hidden */
import { firebaseConfig } from './config';
import { warn } from './logger';

// Set up for config and vars
export function setup() {
  // TEMPORARY WORKAROUND (BUG 63586213):
  // Until the Cloud Functions builder can publish FIREBASE_CONFIG, automatically provide it on import based on what
  // we can deduce.
  if (!process.env.FIREBASE_CONFIG) {
    const cfg = firebaseConfig();
    if (cfg) {
      process.env.FIREBASE_CONFIG = JSON.stringify(cfg);
    }
  }

  // WORKAROUND (BUG 134416569): GCLOUD_PROJECT missing in Node 10
  if (!process.env.GCLOUD_PROJECT && process.env.FIREBASE_CONFIG) {
    process.env.GCLOUD_PROJECT = JSON.parse(
      process.env.FIREBASE_CONFIG
    ).projectId;
  }

  // If FIREBASE_CONFIG is still not found, try using GCLOUD_PROJECT to estimate
  if (!process.env.FIREBASE_CONFIG) {
    if (process.env.GCLOUD_PROJECT) {
      warn(
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
      warn(
        'Warning, FIREBASE_CONFIG and GCLOUD_PROJECT environment variables are missing. Initializing firebase-admin will fail'
      );
    }
  }
}
