
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
import * as firebase from 'firebase-admin';

export function config(): config.Config {
  if (typeof config.singleton === 'undefined') {
    const cred = firebase.credential.applicationDefault();
    init(cred);
  }
  return config.singleton;
}

export namespace config {
  // Config type is usable as a object (dot notation allowed), and firebase
  // property will also code complete.
  export type Config = { [key: string]: any } & { firebase?: firebase.AppOptions };

  /** @internal */
  export let singleton: config.Config;
}

function init (credential: firebase.credential.Credential) {
  let loadedFromFile = {};
  let firebaseEnv = {};
  if (process.env.FIREBASE_PROJECT) {
    firebaseEnv = { firebase: JSON.parse(process.env.FIREBASE_PROJECT) };
  }

  try {
    let path = process.env.CLOUD_RUNTIME_CONFIG || '../../../.runtimeconfig.json';
    loadedFromFile = require(path);
  } catch (e) {
    // Do nothing
  }
  let merged= _.merge({}, loadedFromFile, firebaseEnv);

  if (!_.has(merged, 'firebase')) {
    throw new Error('Firebase config variables are not available. ' +
    'Please use the latest version of the Firebase CLI to deploy this function.');
  }

  _.set(merged, 'firebase.credential', credential);
  config.singleton = merged;
}
