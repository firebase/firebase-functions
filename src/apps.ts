import * as _ from 'lodash';
import * as firebase from 'firebase';

import DefaultCredential from './default-credential';
import { FirebaseEnv } from './env';

export interface AuthMode {
  admin: boolean;
  variable?: any;
}

export default class Apps {
  private static _noauth: firebase.app.App;
  private static _admin: firebase.app.App;

  private _env: FirebaseEnv;

  constructor(env: FirebaseEnv) {
    this._env = env;
  }

  get admin(): firebase.app.App {
    Apps._admin = Apps._admin || firebase.initializeApp({
      databaseURL: _.get(this._env.data, 'firebase.databaseURL'),
      credential: new DefaultCredential(),
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
        credential: new DefaultCredential(),
      }, key);
    }
  }
}
