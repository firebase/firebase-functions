/// <reference path="firebase.d.ts" />

import {App} from 'firebase';
import {tokenToApp} from './utils';

interface FirebaseEventOptions {
  service: string;
  type: string;
  instance?: string;
  uid?: string;
  deviceId?: string;
  data?: any;
  params?: {[option: string]: any};
  authToken?: string;
}

export default class FirebaseEvent<T> {
  service: string;
  type: string;
  instance: string;
  uid: string;
  deviceId: string;
  data: T;
  params: {[option: string]: any};
  authToken: string;
  _app: App;

  constructor(options: FirebaseEventOptions) {
    [this.service, this.type, this.instance, this.uid, this.deviceId, this.data, this.params, this.authToken] =
      [options.service, options.type, options.instance, options.uid, options.deviceId, options.data, options.params || {}, options.authToken];
  }

  get app(): App {
    if (!this._app) {
      this._app = tokenToApp(this.authToken);
    }
    return this._app;
  }
}
