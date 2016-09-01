import {TriggerDefinition} from '../trigger';
import {GCFHandler, GCFDatabasePayload} from '../gcf';
import FirebaseEvent from '../event';
import DatabaseDeltaSnapshot from './delta-snapshot';
import {normalizePath} from '../utils';
import internal from '../internal';
import * as _ from 'lodash';
import {FirebaseEventMetadata} from '../event';

export interface DatabaseTriggerDefinition extends TriggerDefinition {
  path: string;
}

export default class DatabaseBuilder {
  private _path: string;
  private _condition: string;
  private _filter: string;

  _toConfig(event?: string): DatabaseTriggerDefinition {
    return {
      service: 'firebase.database',
      event: event || 'write',
      path: this._path
    };
  }

  path(path: string): DatabaseBuilder {
    this._path = this._path || '';
    this._path += normalizePath(path);
    return this;
  }

  on(event: string, handler: (event: FirebaseEvent<DatabaseDeltaSnapshot>) => any): GCFHandler {
    if (event !== 'write') {
      throw new Error(`Provider database does not support event type "${event}"`);
    }

    console.warn('DEPRECATION NOTICE: database().on("write", handler) is deprecated, use database().onWrite(handler)');
    return this.onWrite(handler);
  }

  onWrite(handler: (event: FirebaseEvent<DatabaseDeltaSnapshot>) => any): GCFHandler {
    if (!this._path) {
      throw new Error('Must call .path(pathValue) before .on() for database function definitions.');
    }

    let wrappedHandler: GCFHandler = function(payload: GCFDatabasePayload) {
      // TODO(thomas/bleigh) 'instance' isn't part of the wire protocol. Should it be? It should also probably be
      // resource
      // TODO(thomas) add service to the wire protocol (http://b/30482184)
      const metadata = <FirebaseEventMetadata>_.extend({}, payload, {
        service: 'firebase.database',
        instance: internal.env.get('firebase.database.url')
      });
      const event = new FirebaseEvent(metadata, new DatabaseDeltaSnapshot(payload));
      return handler(event);
    };

    wrappedHandler.__trigger = this._toConfig();
    return wrappedHandler;
  }
}
