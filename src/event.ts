/// <reference path="firebase.d.ts" />

import {App} from 'firebase';
import internal from './internal';

interface FirebaseEventOptions {
  service: string;
  type: string;
  instance?: string;
  deviceId?: string;
  data?: any;
  params?: {[option: string]: any};
  auth?: AuthMode;
}

export default class FirebaseEvent<T> {
  service: string;
  type: string;
  instance: string;
  uid: string;
  deviceId: string;
  data: T;
  params: {[option: string]: any};
  auth: any;
  _app: App;

  constructor(options: FirebaseEventOptions) {
    [this.service, this.type, this.instance, this.deviceId, this.data, this.params, this.auth] =
      [options.service, options.type, options.instance, options.deviceId, options.data, options.params || {}, options.auth.variable];
    if (typeof options.auth.variable === 'object' && options.auth.variable.hasOwnProperty('uid')) {
      this.uid = options.auth.variable.uid;
    }
  }

  get app(): App {
    if (!this._app) {
      this._app = internal.apps.forMode(this.auth);
    }
    return this._app;
  }
}
