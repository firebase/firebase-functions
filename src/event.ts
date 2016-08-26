import * as firebase from 'firebase';
import internal from './internal';
import * as _ from 'lodash';
import { AuthMode } from './gcf';

export interface FirebaseEventMetadata {
  service: string;
  type: string;
  instance?: string;
  deviceId?: string;
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
  private _auth: AuthMode; // we have not yet agreed on what we want to expose here
  private _app: firebase.app.App;

  constructor(metadata: FirebaseEventMetadata, data: T) {
    [this.service, this.type, this.instance, this.deviceId, this.data, this.params, this._auth] =
      [metadata.service, metadata.type, metadata.instance, metadata.deviceId, data, metadata.params || {}, metadata.auth];

    if (_.has(this._auth, 'variable.uid')) {
      this.uid = metadata.auth.variable.uid;
    }
  }

  get app(): firebase.app.App {
    if (!this._app) {
      this._app = internal.apps.forMode(this._auth);
    }
    return this._app;
  }
}
