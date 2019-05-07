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

const RUNTIME_CONFIG_FILE = '.runtimeconfig.json';

function getRootDir(): string {
  // In Node 10 and up, there is an extra directory where the functions code
  // lives. The runtime config file still lives in /srv
  let pwd = process.env.PWD;
  if (pwd == '/srv/functions') {
    pwd = '/srv';
  }
  return pwd;
}

export function config(): config.Config {
  if (typeof config.singleton === 'undefined') {
    init();
  }
  return config.singleton;
}

export namespace config {
  // Config type is usable as a object (dot notation allowed), and firebase
  // property will also code complete.
  export type Config = { [key: string]: any };

  /** @internal */
  export let singleton: config.Config;
}

/* @internal */
export function firebaseConfig(): firebase.AppOptions | null {
  const env = process.env.FIREBASE_CONFIG;
  if (env) {
    return JSON.parse(env);
  }

  try {
    const path = `${getRootDir()}/${RUNTIME_CONFIG_FILE}`;
    const config = require(path);
    if (config.firebase) {
      return config.firebase;
    }
  } catch (e) {
    console.error('Could not initialize FIREBASE_CONFIG: ' + e.message);
  }
  return null;
}

function init() {
  try {
    const path = `${getRootDir()}/${RUNTIME_CONFIG_FILE}`;
    const parsed = require(path);
    delete parsed.firebase;
    config.singleton = parsed;
  } catch (e) {
    console.error('Could not initialize Runtime Config values: ' + e.message);
    config.singleton = {};
  }
}
