import * as _ from 'lodash';
import * as firebase from 'firebase';
import { Credential } from './credential';
import { FirebaseEnv } from './env';

export interface AuthMode {
  admin: boolean;
  variable?: any;
}

export default class Apps {
  private static _noauth: firebase.app.App;
  private static _admin: firebase.app.App;

  private _env: FirebaseEnv;
  private _credential: Credential;

  constructor(credential: Credential, env: FirebaseEnv) {
    this._env = env;
    this._credential = credential;
  }

  get admin(): firebase.app.App {
    // TODO(inlined) this should be initializeApp(env.data.firebase)
    // TODO(inlined) add credentail to env
    Apps._admin = Apps._admin || firebase.initializeApp({
      databaseURL: _.get(this._env.data, 'firebase.databaseURL'),
      credential: this._credential,
    }, '__admin__');
    return Apps._admin;
  }

  get noauth(): firebase.app.App {
    Apps._noauth = Apps._noauth || firebase.initializeApp({
      databaseURL: _.get(this._env.data, 'firebase.databaseURL'),
    }, '__noauth__');
    return Apps._noauth;
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
      return firebase.initializeApp({
        databaseURL: _.get(this._env.data, 'firebase.databaseURL'),
        databaseAuthVariableOverride: auth.variable,
        credential: this._credential,
      }, key);
    }
  }
}
