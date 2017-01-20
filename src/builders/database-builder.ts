import { AuthMode, default as Apps } from '../apps';
import DatabaseDeltaSnapshot from '../database/delta-snapshot';
import { Event } from '../event';
import { FunctionBuilder, TriggerDefinition, CloudFunction } from '../builder';
import { normalizePath } from '../utils';
import { FirebaseEnv } from '../env';

export interface DatabaseTriggerDefinition extends TriggerDefinition {
  path: string;
}

export interface DatabaseEventData {
  data: any;
  delta: any;
}

export interface DatabaseEvent extends Event<DatabaseEventData> {
  auth: AuthMode;
}

export default class DatabaseBuilder extends FunctionBuilder {
  private _path: string;
  private _apps: Apps;

  constructor(env: FirebaseEnv, apps: Apps) {
    super(env);
    this._apps = apps;
  }

  path(path: string): DatabaseBuilder {
    this._path = this._path || '';
    this._path += normalizePath(path);
    return this;
  }

  onWrite(
    handler: (event: Event<DatabaseDeltaSnapshot>) => PromiseLike<any> | any
  ): CloudFunction {
    if (!this._path) {
      throw new Error('Must call .path(pathValue) before .onWrite() for database function definitions.');
    }
    return this._makeHandler(handler, 'data.write');
  }

  protected _toTrigger(event: string): TriggerDefinition {
    return {
      eventTrigger: {
        eventType: 'providers/firebase.database/eventTypes/' + event,
        resource: 'projects/' + process.env.GCLOUD_PROJECT,
        path: this._path,
      },
    };
  }

  protected _dataConstructor(payload: any): DatabaseDeltaSnapshot {
    return new DatabaseDeltaSnapshot(this._apps, payload);
  }
}
