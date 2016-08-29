import * as cloud from './cloud';
import DatabaseBuilder from './database/builder';
import FirebaseEnv from './env'
import internal from './internal'
import * as firebase from 'firebase';

export default class FirebaseFunctions {
  /**
   * Namespace for Google Cloud Platform function builders.
   */
  cloud:cloud.CloudBuilders;

  constructor() {
    this.cloud = cloud;
  }

  /**
   * Create a builder for a Firebase Realtime Databse function.
   */
  database():DatabaseBuilder {
    return new DatabaseBuilder();
  }

  /**
   * A Firebase App automatically authenticated with a service account
   * when running in a Firebase Function.
   */
  get app():firebase.app.App {
    return internal.apps.admin;
  }

  /**
   * Environment variables available within functions.
   */
  get env():FirebaseEnv {
    return internal.env;
  }
}