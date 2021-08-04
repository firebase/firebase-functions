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

import * as fs from 'fs';
import * as path from 'path';

import * as firebase from 'firebase-admin';

export function config(): config.Config {
  // K_CONFIGURATION is only set in GCFv2
  if (process.env.K_CONFIGURATION) {
    throw new Error(
      'functions.config() is no longer available in Cloud Functions for ' +
        'Firebase v2. Please see the latest documentation for information ' +
        'on how to transition to using environment variables'
    );
  }
  if (typeof config.singleton === 'undefined') {
    init();
  }
  return config.singleton;
}

/**
 * Store and retrieve project configuration data such as third-party API
 * keys or other settings. You can set configuration values using the
 * Firebase CLI as described in
 * [Environment Configuration](/docs/functions/config-env).
 */
export namespace config {
  /**
   * The Functions configuration interface.
   *
   * Access via `functions.config()`.
   */
  export interface Config {
    [key: string]: any;
  }

  /** @hidden */
  export let singleton: config.Config;
}

/** @hidden */
export let firebaseConfigCache: firebase.AppOptions | null = null;

/** @hidden */
export function firebaseConfig(): firebase.AppOptions | null {
  if (firebaseConfigCache) {
    return firebaseConfigCache;
  }

  let env = process.env.FIREBASE_CONFIG;
  if (env) {
    // Firebase Tools will always use a JSON blob in prod, but docs
    // explicitly state that the user can set the env to a file:
    // https://firebase.google.com/docs/admin/setup#initialize-without-parameters
    if (!env.startsWith('{')) {
      env = fs.readFileSync(path.join(process.env.PWD, env)).toString('utf8');
    }

    firebaseConfigCache = JSON.parse(env);
    return firebaseConfigCache;
  }

  // Could have Runtime Config with Firebase in it as an ENV value.
  try {
    const config = JSON.parse(process.env.CLOUD_RUNTIME_CONFIG);
    if (config.firebase) {
      firebaseConfigCache = config.firebase;
      return firebaseConfigCache;
    }
  } catch (e) {
    // Do nothing
  }

  // Could have Runtime Config with Firebase in it as an ENV location or default.
  try {
    const configPath =
      process.env.CLOUD_RUNTIME_CONFIG ||
      path.join(process.cwd(), '.runtimeconfig.json');
    const contents = fs.readFileSync(configPath);
    const config = JSON.parse(contents.toString('utf8'));
    if (config.firebase) {
      firebaseConfigCache = config.firebase;
      return firebaseConfigCache;
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
    const configPath =
      process.env.CLOUD_RUNTIME_CONFIG ||
      path.join(process.cwd(), '.runtimeconfig.json');
    const contents = fs.readFileSync(configPath);
    const parsed = JSON.parse(contents.toString('utf8'));
    delete parsed.firebase;
    config.singleton = parsed;
    return;
  } catch (e) {
    // Do nothing
  }

  config.singleton = {};
}
