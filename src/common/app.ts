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

import {
  App,
  applicationDefault,
  // getApp as getAppNamed,
  deleteApp,
  initializeApp,
} from 'firebase-admin/app';
import { firebaseConfig } from '../config';

const APP_NAME = '__FIREBASE_FUNCTIONS_SDK__';

let cache: App;
export function getApp(): App {
  // if (typeof cache === 'undefined') {
  //   cache = getAppNamed(/* default */);
  // }
  if (typeof cache === 'undefined') {
    cache = initializeApp(
      {
        ...firebaseConfig(),
        credential: applicationDefault(),
      },
      APP_NAME
    );
  }
  return cache;
}

/**
 * This function allows the Firebase Emulator Suite to override the FirebaseApp instance
 * used by the Firebase Functions SDK. Developers should never call this function for
 * other purposes.
 * N.B. For clarity for use in testing this name has no mention of emulation, but
 * it must be exported from index as app.setEmulatedAdminApp or we break the emulator.
 * We can remove this export when:
 * A) We complete the new emulator and no longer depend on monkeypatching
 * B) We tweak the CLI to look for different APIs to monkeypatch depending on versions.
 * @alpha
 */
export function setApp(app?: App) {
  if (cache?.name === APP_NAME) {
    deleteApp(cache);
  }
  cache = app;
}
