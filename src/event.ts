import * as firebase from 'firebase';
import * as _ from 'lodash';

import Apps from './apps';
import { AuthMode } from './apps';

export interface RawEvent {
  requestId?: string;
  timestamp?: string;
  authentication?: Object;
  action: string;
  resource: string;
  path?: string;
  params?: {[option: string]: any};
  data: any;
}

export interface FirebaseEventMetadata {
  action: string;
  resource: string;
  path?: string;
  params?: {[option: string]: string}; // value type used to be any, need to test this on all events to ensure it's okay
  auth?: AuthMode;
  timestamp?: string;
}

export class Event<T> {
  requestId?: string;
  timestamp: string;
  authentication?: Object;
  uid: string;
  action: string;
  resource: string;
  path?: string;
  params?: {[option: string]: any};
  data: T;

  protected _auth: AuthMode; // we have not yet agreed on what we want to expose here

  constructor(metadata: FirebaseEventMetadata, data: T) {
    this.timestamp = metadata.timestamp ? metadata.timestamp : new Date().toISOString();

    [this.action, this.resource, this.path, this.data, this.params, this._auth] = [
      metadata.action, metadata.resource, metadata.path, data, metadata.params || {}, metadata.auth,
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
