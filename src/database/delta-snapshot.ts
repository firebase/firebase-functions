import * as _ from 'lodash';
import * as firebase from 'firebase';

import { AuthMode, default as Apps } from '../apps';
import { DatabasePayload } from './builder';
import { FirebaseEnv } from '../env';
import { normalizePath, pathParts, applyChange, valAt } from '../utils';

export default class DatabaseDeltaSnapshot {
  private _adminRef: firebase.database.Reference;
  private _apps: Apps;
  private _env: FirebaseEnv;
  private _ref: firebase.database.Reference;
  private _path: string;
  private _auth: AuthMode;
  private _data: any;
  private _delta: any;
  private _newData: any;

  private _childPath: string;
  private _isPrevious: boolean;

  constructor(env: FirebaseEnv, eventData?: DatabasePayload) {
    this._env = env;
    this._apps = new Apps(this._env);

    if (eventData) {
      this._path = eventData.path;
      this._auth = eventData.auth;
      this._data = eventData.data;
      this._delta = eventData.delta;
      this._newData = applyChange(this._data, this._delta);
    }
  }

  get ref(): firebase.database.Reference {
    if (!this._ref) {
      this._ref = this._apps.forMode(this._auth).database().ref(this._fullPath());
    }
    return this._ref;
  }

  get adminRef(): firebase.database.Reference {
    if (!this._adminRef) {
      this._adminRef = this._apps.admin.database().ref(this._fullPath());
    }
    return this._adminRef;
  }

  get key(): string {
    let fullPath = this._fullPath().substring(1).split('/');
    let last = _.last(fullPath);
    return (!last || last === '') ? null : last;
  }

  val(): any {
    let parts = pathParts(this._childPath);
    let source = this._isPrevious ? this._data : this._newData;
    return _.cloneDeep(parts.length ? _.get(source, parts, null) : source);
  }

  exists(): boolean {
    return !_.isNull(this.val());
  }

  child(childPath?: string): DatabaseDeltaSnapshot {
    if (!childPath) {
      return this;
    }
    return this._dup(this._isPrevious, childPath);
  }

  get previous(): DatabaseDeltaSnapshot {
    return this._isPrevious ? this : this._dup(true);
  }

  get current(): DatabaseDeltaSnapshot {
    return this._isPrevious ? this._dup(false) : this;
  }

  changed(): boolean {
    return valAt(this._delta, this._childPath) !== undefined;
  }

  forEach(childAction: Function) {
    let val = this.val();
    if (_.isPlainObject(val)) {
      _.keys(val).forEach(key => childAction(this.child(key)));
    }
  }

  hasChild(childPath: string): boolean {
    return this.child(childPath).exists();
  }

  hasChildren(): boolean {
    let val = this.val();
    return _.isPlainObject(val) && _.keys(val).length > 0;
  }

  numChildren(): number {
    let val = this.val();
    return _.isPlainObject(val) ? Object.keys(val).length : 0;
  }

  private _dup(previous: boolean, childPath?: string): DatabaseDeltaSnapshot {
    let dup = new DatabaseDeltaSnapshot(this._env);
    [dup._path, dup._auth, dup._data, dup._delta, dup._childPath, dup._newData] =
      [this._path, this._auth, this._data, this._delta, this._childPath, this._newData];

    if (previous) {
      dup._isPrevious = true;
    }

    if (childPath) {
      dup._childPath = dup._childPath || '';
      dup._childPath += normalizePath(childPath);
    }

    return dup;
  }

  private _fullPath(): string {
    let out = (this._path || '') + (this._childPath || '');
    if (out === '') {
      out = '/';
    }
    return out;
  }
}
