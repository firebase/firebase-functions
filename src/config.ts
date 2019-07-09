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

import * as firebase from 'firebase-admin';

export function config(): config.Config {
  if (typeof config.singleton === 'undefined') {
    init();
  }
  return config.singleton;
}

export namespace config {
  // Config type is usable as a object (dot notation allowed), and firebase
  // property will also code complete.
  export interface Config {
    [key: string]: any;
  }

  /** @hidden */
  export let singleton: config.Config;
}

/* @hidden */
export function firebaseConfig(): firebase.AppOptions | null {
  const env = process.env.FIREBASE_CONFIG;
  if (env) {
    return JSON.parse(env);
  }

  // Could have Runtime Config with Firebase in it as an ENV value.
  try {
    const config = JSON.parse(process.env.CLOUD_RUNTIME_CONFIG);
    if (config.firebase) {
      return config.firebase;
    }
  } catch (e) {
    // Do nothing
  }

  // Could have Runtime Config with Firebase in it as an ENV location or default.
  try {
    const path =
      process.env.CLOUD_RUNTIME_CONFIG || '../../../.runtimeconfig.json';
    const config = require(path);
    if (config.firebase) {
      return config.firebase;
    }
  } catch (e) {
    // Do nothing
  }

  return null;
}

function init() {
  try {
    const parsed = JSON.parse(process.env.CLOUD_RUNTIME_CONFIG);
    delete parsed.firebase;
    config.singleton = parsed;
    return;
  } catch (e) {
    // Do nothing
  }

  try {
    const path =
      process.env.CLOUD_RUNTIME_CONFIG || '../../../.runtimeconfig.json';
    const parsed = require(path);
    delete parsed.firebase;
    config.singleton = parsed;
    return;
  } catch (e) {
    // Do nothing
  }

  config.singleton = {};
}
