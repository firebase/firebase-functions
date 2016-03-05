/// <reference path="../gcf.d.ts" />
/// <reference path="../../typings/main.d.ts" />

import FirebaseEvent from '../event';
import DatabaseDeltaSnapshot from './delta-snapshot';
import {normalizePath} from '../utils';
import {env} from '../index';

export default class DatabaseBuilder {
  private _path: string;
  private _condition: string;
  private _filter: string;

  _toConfig(event?: string): any {
    return {
      path: this._path,
      event: event || 'write'
    };
  }

  path(path: string): DatabaseBuilder {
    this._path = this._path || '';
    this._path += normalizePath(path);
    return this;
  }

  on(event: string, handler: (FirebaseEvent) => any): GCFHandler {
    if (!this._path) {
      throw new Error('Must call .path(pathValue) before .on() for database function definitions.');
    }

    let wrappedHandler: GCFHandler = function(data: GCFDatabasePayload) {
      let event = new FirebaseEvent({
        service: 'firebase.database',
        type: data['event'],
        instance: env().get('firebase.database.url'),
        data: new DatabaseDeltaSnapshot(data)
      });

      return handler(event);
    };

    wrappedHandler.__trigger = this._toConfig();
    return wrappedHandler;
  }
}
