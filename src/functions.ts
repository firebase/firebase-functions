import * as firebase from 'firebase';

import Apps from './apps';
import CloudBuilders from './cloud/index';
import { FirebaseEnv, FirebaseEnvData } from './env';
import DatabaseBuilder from './database/builder';

export default class FirebaseFunctions {
  /**
   * Namespace for Google Cloud Platform function builders.
   */
  cloud: CloudBuilders;

  private _env: FirebaseEnv;
  private _apps: Apps;

  constructor(env: FirebaseEnv, apps: Apps) {
    this._env = env;
    this.cloud = new CloudBuilders(this._env);
  }

  /**
   * Create a builder for a Firebase Realtime Databse function.
   */
  database(): DatabaseBuilder {
    return new DatabaseBuilder(this._env);
  }

  /**
   * A Firebase App automatically authenticated with a service account
   * when running in a Firebase Function.
   */
  get app(): firebase.app.App {
    return this._apps.admin;
  }

  /**
   * Environment variables available within functions.
   */
  get env(): FirebaseEnvData {
    return this._env.data;
  }

  /**
   * Returns a Promise that resolves when environment is fully ready.
   */
  ready(): PromiseLike<any> {
    return this._env.ready();
  }
}
