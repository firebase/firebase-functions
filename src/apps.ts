import * as _ from 'lodash';
import * as firebase from 'firebase-admin';
import { env } from './env';
import * as Promise from 'bluebird';
import sha1 = require('sha1');

/** @internal */
export function apps(): apps.Apps {
  return apps.singleton;
}

/** @internal */
export namespace apps {
  export let singleton: apps.Apps;

  export let init = (env: env.Env) => singleton = new Apps(env);

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
    private _env: env.Env;
    private _refCounter: RefCounter;

    constructor(env: env.Env) {
      this._env = env;
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

    _waitToDestroyApp(appName: string) {
      if (!this._appAlive(appName)) {
        return Promise.resolve();
      }
      return Promise.delay(120000).then(() => {
        if (!this._appAlive(appName)) {
          return;
        }
        if (_.get(this._refCounter, appName) === 0) {
          return firebase.app(appName).delete().catch(_.noop);
        }
      });
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
      _.update(this._refCounter, '__admin__', decrement);
      _.update(this._refCounter, this._appName(auth), decrement);
      _.forEach(this._refCounter, (count, key) => {
        if (count === 0) {
          this._waitToDestroyApp(key);
        }
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
      return _.get(this._env.data, 'firebase', {});
    }
  }
}
