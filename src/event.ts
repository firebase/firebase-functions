import * as _ from 'lodash';

import { apps } from './apps';

/* Incoming event, no uid and _auth */
export interface RawEvent {
  eventId?: string;
  timestamp?: string;
  auth?: apps.AuthMode;
  eventType?: string;
  resource?: string;
  path?: string;
  params?: {[option: string]: any};
  data: any;
}

/* Has all fields of RawEvent except data, used to construct new Events by
   AbstractFunctionBuilder._makeHandler */
export interface EventMetadata {
  eventId?: string;
  timestamp?: string;
  auth?: apps.AuthMode;
  eventType?: string;
  resource?: string;
  path?: string;
  params?: {[option: string]: any};
}

export class Event<T> {
  eventId?: string;
  timestamp?: string;
  auth?: apps.AuthMode;
  eventType?: string;
  resource?: string;
  path?: string;
  params?: {[option: string]: any};
  data: T;
  uid?: string;

  protected _auth?: apps.AuthMode; // we have not yet agreed on what we want to expose here

  constructor(metadata: EventMetadata, data: T) {
    _.assign(this, metadata);
    this.data = data;
    this.params = this.params || {};
    if (_.has(this._auth, 'variable.uid')) {
      this.uid = metadata.auth.variable.uid;
    }
  }
}
