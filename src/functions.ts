import * as firebase from 'firebase';

import Apps from './apps';
import { FirebaseEnv, FirebaseEnvData } from './env';
import AuthBuilder from './builders/auth-builder';
import DatabaseBuilder from './builders/database-builder';
import HttpsBuilder from './builders/https-builder';
import PubsubBuilder from './builders/pubsub-builder';
import StorageBuilder from './builders/storage-builder';

export default class FirebaseFunctions {
  private _env: FirebaseEnv;
  private _apps: Apps;

  constructor(env: FirebaseEnv, apps: Apps) {
    this._env = env;
    this._apps = apps;
  }

  /**
   * Create a builder for a Firebase Authentication function.
   */
  auth(): AuthBuilder {
    return new AuthBuilder(this._env);
  }

  /**
   * Create a builder for a Firebase Realtime Database function.
   */
  database(): DatabaseBuilder {
    return new DatabaseBuilder(this._env, this._apps);
  }

  /**
   * Create a builder for a HTTPS function.
   */
  https(): HttpsBuilder {
    return new HttpsBuilder(this._env);
  }

  /**
   * Create a builder for a PubSub function.
   */
  pubsub(topic: string): PubsubBuilder {
    return new PubsubBuilder(this._env, topic);
  }

  /**
   * Create a builder for a Storage function.
   */
  storage(bucket: string): StorageBuilder {
    return new StorageBuilder(this._env, bucket);
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
