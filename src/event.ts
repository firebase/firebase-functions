import * as firebase from 'firebase';
import * as _ from 'lodash';

import Apps from './apps';
import { AuthMode } from './apps';

export interface FirebaseEventMetadata {
  service: string;
  type: string;
  instance?: string;
  deviceId?: string;
  params?: {[option: string]: any};
  auth?: AuthMode;
}

export class Event<T> {
  service: string;
  type: string;
  instance: string;
  uid: string;
  deviceId: string;
  data: T;
  params: {[option: string]: any};

  protected _auth: AuthMode; // we have not yet agreed on what we want to expose here

  constructor(metadata: FirebaseEventMetadata, data: T) {
    [this.service, this.type, this.instance, this.deviceId, this.data, this.params, this._auth] = [
      metadata.service, metadata.type, metadata.instance, metadata.deviceId, data, metadata.params || {}, metadata.auth,
    ];

    if (_.has(this._auth, 'variable.uid')) {
      this.uid = metadata.auth.variable.uid;
    }
  }
}

// FirebaseEvent<T> adds access to Firebase-specific helpers like the app.
export class FirebaseEvent<T> extends Event<T> {
  private _app: firebase.app.App;
  private _apps: Apps;

  constructor(apps: Apps, metadata: FirebaseEventMetadata, data: T) {
    super(metadata, data);
    this._apps = apps;
  }

  get app(): firebase.app.App {
    if (!this._app) {
      this._app = this._apps.forMode(this._auth);
    }
    return this._app;
  }
}
