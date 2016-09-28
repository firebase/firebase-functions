import * as _ from 'lodash';

import { AuthMode } from '../apps';
import DatabaseDeltaSnapshot from './delta-snapshot';
import { FirebaseEventMetadata, default as FirebaseEvent } from '../event';
import { FunctionBuilder, FunctionHandler, TriggerDefinition } from '../builder';
import { normalizePath } from '../utils';

export interface DatabasePayload {
  type: string;
  path: string;
  auth: AuthMode;
  data: any;
  delta: any;
  params?: any;
}

export interface DatabaseTriggerDefinition extends TriggerDefinition {
  path: string;
}

export default class DatabaseBuilder extends FunctionBuilder {
  private _path: string;

  path(path: string): DatabaseBuilder {
    this._path = this._path || '';
    this._path += normalizePath(path);
    return this;
  }

  on(event: string, handler: (event: FirebaseEvent<DatabaseDeltaSnapshot>) => any): FunctionHandler {
    if (event !== 'write') {
      throw new Error(`Provider database does not support event type "${event}"`);
    }

    console.warn('DEPRECATION NOTICE: database().on("write", handler) is deprecated, use database().onWrite(handler)');
    return this.onWrite(handler);
  }

  onWrite(handler: (event: FirebaseEvent<DatabaseDeltaSnapshot>) => any): FunctionHandler {
    if (!this._path) {
      throw new Error('Must call .path(pathValue) before .on() for database function definitions.');
    }

    return this._makeHandler((payload: DatabasePayload) => {
      // TODO(thomas/bleigh) 'instance' isn't part of the wire protocol. Should it be? It should also probably be
      // resource
      // TODO(thomas) add service to the wire protocol (http://b/30482184)
      const metadata = <FirebaseEventMetadata>_.extend({}, payload, {
        service: 'firebase.database',
        instance: <string>_.get(this._env.data, 'firebase.databaseURL'),
      });
      const event = new FirebaseEvent(this._env, metadata, new DatabaseDeltaSnapshot(this._env, payload));
      return handler(event);
    }, 'write');
  }

  protected _toTrigger(event?: string): DatabaseTriggerDefinition {
    return {
      service: 'firebase.database',
      event: event || 'write',
      path: this._path,
    };
  }
}
