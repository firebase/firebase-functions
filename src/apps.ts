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
import {config} from './index';
import sha1 = require('sha1');

/** @internal */
export function apps(): apps.Apps {
  if (typeof apps.singleton === 'undefined') {
    apps.init(config());
  }
  return apps.singleton;
}

/** @internal */
export namespace apps {
  /** @internal */
  export const garbageCollectionInterval = 2 * 60 * 1000;

  /** @internal */
  export function delay(delay: number) {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }

  export let singleton: apps.Apps;

  export let init = (config: config.Config) => singleton = new Apps(config);

  export interface AuthMode {
    admin: boolean;
    variable?: any;
  }

  /** @internal */
  export interface RefCounter {
    [appName: string]: number;
  }

  /** @internal */
  export class Apps {
    private _config: config.Config;
    private _refCounter: RefCounter;

    constructor(config: config.Config) {
      this._config = config;
      this._refCounter = {};
    }

    _appAlive(appName: string): boolean {
      try {
        let app = firebase.app(appName);
        return !_.get(app, 'isDeleted_');
      } catch (e) {
        return false;
      }
    }

    _appName(auth: AuthMode): string {
      if (!auth || typeof auth !== 'object') {
        return '__noauth__';
      } else if (auth.admin) {
        return '__admin__';
      } else if (!auth.variable) {
        return '__noauth__';
      } else {
        // Use hash of auth variable as name of user-authenticated app
        return sha1(JSON.stringify(auth.variable)) as string;
      }
    }

    _destroyApp(appName: string) {
      if (!this._appAlive(appName)) {
        return;
      }
      firebase.app(appName).delete().catch(_.noop);
    }

    retain(payload) {
      let auth: AuthMode = _.get(payload, 'auth', null);
      let increment = n => {
        return (n || 0) + 1;
      };
      // Increment counter for admin because function might use event.data.adminRef
      _.update(this._refCounter, '__admin__', increment);
      // Increment counter for according to auth type because function might use event.data.ref
      _.update(this._refCounter, this._appName(auth), increment);
    }

    release(payload) {
      let auth: AuthMode = _.get(payload, 'auth', null);
      let decrement = n => {
        return n - 1;
      };
      return delay(garbageCollectionInterval).then(() => {
        _.update(this._refCounter, '__admin__', decrement);
        _.update(this._refCounter, this._appName(auth), decrement);
        _.forEach(this._refCounter, (count, key) => {
          if (count === 0) {
            this._destroyApp(key);
          }
        });
      });
    }

    get admin(): firebase.app.App {
      if (this._appAlive('__admin__')) {
        return firebase.app('__admin__');
      }
      return firebase.initializeApp(this.firebaseArgs, '__admin__');
    }

    get noauth(): firebase.app.App {
      if (this._appAlive('__noauth__')) {
        return firebase.app('__noauth__');
      }
      const param = _.extend({}, this.firebaseArgs, {
        databaseAuthVariableOverride: null,
      });
      return firebase.initializeApp(param, '__noauth__');
    }

    forMode(auth: AuthMode): firebase.app.App {
      if (typeof auth !== 'object') {
        return this.noauth;
      }
      if (auth.admin) {
        return this.admin;
      }
      if (!auth.variable) {
        return this.noauth;
      }

      const appName = this._appName(auth);
      if (this._appAlive(appName)) {
        return firebase.app(appName);
      }
      const param = _.extend({}, this.firebaseArgs, {
        databaseAuthVariableOverride: auth.variable,
      });
      return firebase.initializeApp(param, appName);
    }

    private get firebaseArgs() {
      return _.get(this._config, 'firebase', {});
    }
  }
}
