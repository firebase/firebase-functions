import { AuthMode, default as Apps } from '../apps';
import DatabaseDeltaSnapshot from './delta-snapshot';
import { FirebaseEvent, RawEvent } from '../event';
import { FunctionBuilder, TriggerDefinition, TriggerAnnotated } from '../builder';
import { normalizePath } from '../utils';
import { FirebaseEnv } from '../env';

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

type DatabaseWriteEventHandler = (event: FirebaseEvent<DatabaseDeltaSnapshot>) => any | PromiseLike<any>;

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

  on(
    event: string, handler: (event: FirebaseEvent<DatabaseDeltaSnapshot>) => any,
  ): TriggerAnnotated & ((event: DatabasePayload | RawEvent) => any) {
    if (event !== 'write') {
      throw new Error(`Provider database does not support event type "${event}"`);
    }

    console.warn('DEPRECATION NOTICE: database().on("write", handler) is deprecated, use database().onWrite(handler)');
    return this.onWrite(handler);
  }

  onWrite(
    handler: (event: FirebaseEvent<DatabaseDeltaSnapshot>) => PromiseLike<any> | any
  ): TriggerAnnotated & ((event: DatabasePayload | RawEvent) => PromiseLike<any> | any) {
    if (!this._path) {
      throw new Error('Must call .path(pathValue) before .on() for database function definitions.');
    }
    return this._wrapHandler(handler, 'write', {
      action: 'sources/firebase.database/actions/write',
      resource: 'projects/' + process.env.GCLOUD_PROJECT,
      path: this._path,
    }, (payload: DatabasePayload) => {
      if (this._isEventNewFormat(payload)) {
        return new DatabaseDeltaSnapshot(this._apps, payload.data);
      }
      return new DatabaseDeltaSnapshot(this._apps, payload);
    });
  }

  protected _toTrigger(event?: string): DatabaseTriggerDefinition {
    return {
      service: 'firebase.database',
      event: event || 'write',
      path: this._path,
    };
  }
}
