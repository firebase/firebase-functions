import * as _ from 'lodash';
import * as firebase from 'firebase-admin';
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
    Apps._admin = Apps._admin || firebase.initializeApp(this.firebaseArgs, '__admin__');
    return Apps._admin;
  }

  get noauth(): firebase.app.App {
    const param = _.extend({}, this.firebaseArgs, {
      databaseAuthVariableOverride: null,
    });
    Apps._noauth = Apps._noauth || firebase.initializeApp(param, '__noauth__');
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
      const param = _.extend({}, this.firebaseArgs, {
        databaseAuthVariableOverride: auth.variable,
      });
      return firebase.initializeApp(param, key);
    }
  }

  private get firebaseArgs() {
    return _.get(this._env.data, 'firebase', {});
  }
}
