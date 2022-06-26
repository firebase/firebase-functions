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
import * as _ from 'lodash';
import { firebaseConfig } from './config';

export function apps(): apps.Apps {
  if (typeof apps.singleton === 'undefined') {
    apps.init();
  }
  return apps.singleton;
}

export namespace apps {
  /** @hidden */
  export const garbageCollectionInterval = 2 * 60 * 1000;

  /** @hidden */
  export function delay(delay: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  export let singleton: apps.Apps;

  export let init = () => (singleton = new Apps());

  export interface AuthMode {
    admin: boolean;
    variable?: any;
  }

  /** @hidden */
  export interface RefCounter {
    [appName: string]: number;
  }

  export class Apps {
    private _refCounter: RefCounter;
    private _emulatedAdminApp?: firebase.app.App;

    constructor() {
      this._refCounter = {};
    }

    _appAlive(appName: string): boolean {
      try {
        const app = firebase.app(appName);
        return !_.get(app, 'isDeleted_');
      } catch (e) {
        return false;
      }
    }

    _destroyApp(appName: string) {
      if (!this._appAlive(appName)) {
        return;
      }
      firebase
        .app(appName)
        .delete()
        .catch(_.noop);
    }

    retain() {
      const increment = (n?: number) => {
        return (n || 0) + 1;
      };
      // Increment counter for admin because function might use event.data.ref
      _.update(this._refCounter, '__admin__', increment);
    }

    release() {
      const decrement = (n: number) => {
        return n - 1;
      };
      return delay(garbageCollectionInterval).then(() => {
        _.update(this._refCounter, '__admin__', decrement);
        _.forEach(this._refCounter, (count, key) => {
          if (count <= 0) {
            this._destroyApp(key);
          }
        });
      });
    }

    get admin(): firebase.app.App {
      if (this._emulatedAdminApp) {
        return this._emulatedAdminApp;
      }

      if (this._appAlive('__admin__')) {
        return firebase.app('__admin__');
      }
      return firebase.initializeApp(this.firebaseArgs, '__admin__');
    }

    /**
     * This function allows the Firebase Emulator Suite to override the FirebaseApp instance
     * used by the Firebase Functions SDK. Developers should never call this function for
     * other purposes.
     */
    setEmulatedAdminApp(app: firebase.app.App) {
      this._emulatedAdminApp = app;
    }

    private get firebaseArgs() {
      return _.assign({}, firebaseConfig(), {
        credential: firebase.credential.applicationDefault(),
      });
    }
  }
}
