import * as _ from 'lodash';
import * as firebase from 'firebase';
import { FirebaseEnv } from './env';
import * as Promise from 'bluebird';

export interface AuthMode {
  admin: boolean;
  variable?: any;
}

export interface RefCounter {
  admin: number;
  noauth: number;
  user: {[uuid: string]: number};
}

export default class Apps {
  private static _noauth: firebase.app.App;
  private static _admin: firebase.app.App;
  private _env: FirebaseEnv;
  private _refCounter: RefCounter;

  constructor(env: FirebaseEnv) {
    this._env = env;
    this._refCounter = {
      admin: 0,
      noauth: 0,
      user: {},
    };
  }

  _waitToDestroyApp(app: firebase.app.App) {
    if (!app) {
      console.log('resolved promise since app is empty');
      return Promise.resolve();
    }
    return Promise.delay(120000).then(() => {
      console.log('deleting app');
      return app.delete();
    }).then(() => {
      console.log('app deleted');
    });
  }

  _changeRefCounter() {
    return Promise.delay(120000).then(() => {
      console.log('time passed');
      this._refCounter = {
        admin: 1000,
        noauth: 1000,
        user: {},
      };
    });
  }

  _waitToDestroyUserApp(key: string) {
    try {
      let app = firebase.app(key);
      console.log('deleting user app...');
      return this._waitToDestroyApp(app);
    } catch (e) {
      return Promise.resolve();
    }
  }

  _waitToDestroyAdmin() {
    console.log('deleting admin app...');
    return this._waitToDestroyApp(Apps._admin);
  }

  _waitToDestroyNoauth() {
    console.log('deleting noauth app...');
    return this._waitToDestroyApp(Apps._noauth);
  }

  retain(payload) {
    let auth: AuthMode | null = _.get(payload, 'auth', null);
    this._refCounter.admin ++;
    if (!auth || typeof auth !== 'object') {
      this._refCounter.noauth ++;
    } else if (auth.admin) {
      this._refCounter.admin ++;
    } else if (!auth.variable) {
      this._refCounter.noauth ++;
    } else {
      const key = JSON.stringify(auth.variable);
      let count = _.get(this._refCounter.user, key, 0);
      _.set(this._refCounter.user, key, count+1);
    }
  }

  release(payload) {
    let auth: AuthMode | null = _.get(payload, 'auth', null);
    this._refCounter.admin --;
    if (!auth || typeof auth !== 'object') {
      this._refCounter.noauth --;
    } else if (auth.admin) {
      this._refCounter.admin --;
    } else if (!auth.variable) {
      this._refCounter.noauth --;
    } else {
      const key = JSON.stringify(auth.variable);
      let count = _.get(this._refCounter.user, key, 0);
      if (count < 2) {
        this._waitToDestroyUserApp(key);
      }
      _.set(this._refCounter.user, key, count-1);
    }
    if (this._refCounter.admin === 0) {
      this._waitToDestroyAdmin();
    }
    if (this._refCounter.noauth === 0) {
      this._waitToDestroyNoauth();
    }
  }
  get admin(): firebase.app.App {
    try {
      return firebase.app('__admin__');
    } catch (e) {
      console.log('Need to init admin app');
      Apps._admin = firebase.initializeApp(this.firebaseArgs, '__admin__');
      return Apps._admin;
    }
  }

  get noauth(): firebase.app.App {
    try {
      return firebase.app('__noauth__');
    } catch (e) {
      console.log('Need to init noauth app');
      Apps._noauth = firebase.initializeApp(_.omit(this.firebaseArgs, 'credential'), '__noauth__');
      return Apps._noauth;
    }
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

    const key = JSON.stringify(auth.variable);
    try {
      return firebase.app(key);
    } catch (e) {
      const param = _.extend({}, this.firebaseArgs, {databaseAuthVariableOverride: auth.variable});
      return firebase.initializeApp(param, key);
    }
  }

  private get firebaseArgs() {
    return _.get(this._env.data, 'firebase', {});
  }
}
