import * as _ from 'lodash';
import { apps } from '../apps';
import { env } from '../env';
import {Event, RawEvent} from '../event';
import { AbstractFunctionBuilder, Trigger, CloudFunction } from './base';
import {normalizePath, applyChange, pathParts, valAt} from '../utils';
import * as firebase from 'firebase-admin';

export function database() {
  return new database.FunctionBuilder(apps());
}

export namespace database {
  export class FunctionBuilder extends AbstractFunctionBuilder {
    private _path: string;
    private _apps: apps.Apps;

    constructor(apps: apps.Apps) {
      super();
      this._apps = apps;
    }

    path(path: string): FunctionBuilder {
      this._path = this._path || '';
      this._path += normalizePath(path);
      return this;
    }

    onWrite(handler: (event: Event<DeltaSnapshot>) => PromiseLike<any> | any): CloudFunction {
      if (!this._path) {
        throw new Error('Must call .path(pathValue) before .onWrite() for database function definitions.');
      }
      let fnWithDataConstructor: any = (payload: RawEvent) => {
        let e: Event<DeltaSnapshot> = new Event(payload, this._dataConstructor(payload));
        return handler(e);
      };
      let handlerWithRefCounting: any = (payload) => {
        return env().ready()
        .then(() => {
          this._apps.retain(payload);
          return fnWithDataConstructor(payload);
        }).then((res) => {
          this._apps.release(payload);
        }, (err) => {
          this._apps.release(payload);
        });
      };
      handlerWithRefCounting.__trigger = this._toTrigger('data.write');
      return handlerWithRefCounting;
    }

    protected _toTrigger(event: string): Trigger {
      return {
        eventTrigger: {
          eventType: 'providers/firebase.database/eventTypes/' + event,
          resource: 'projects/' + process.env.GCLOUD_PROJECT,
          path: this._path,
        },
      };
    }

    protected _dataConstructor(rawEvent: RawEvent): DeltaSnapshot {
      return new DeltaSnapshot(this._apps, rawEvent);
    }
  }

  export class DeltaSnapshot {
    private _adminRef: firebase.database.Reference;
    private _apps: apps.Apps;
    private _ref: firebase.database.Reference;
    private _path: string;
    private _auth: apps.AuthMode;
    private _data: any;
    private _delta: any;
    private _newData: any;

    private _childPath: string;
    private _isPrevious: boolean;

    constructor(apps: apps.Apps, event?: RawEvent) {
      this._apps = apps;

      if (event) {
        this._path = event.path;
        this._auth = event.auth;
        this._data = event.data.data;
        this._delta = event.data.delta;
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
      let node = _.cloneDeep(parts.length ? _.get(source, parts, null) : source);
      return this._checkAndConvertToArray(node);
    }

    /* Recursive function to check if keys are numeric & convert node object to array if they are */
    _checkAndConvertToArray(node): any {
      if (node === null || typeof node === 'undefined') {
        return null;
      }
      if (typeof node !== 'object') {
        return node;
      }
      let obj = {};
      let numKeys = 0;
      let maxKey = 0;
      let allIntegerKeys = true;
      _.forEach(node, (childNode, key) => {
        obj[key] = this._checkAndConvertToArray(childNode);
        numKeys++;
        const integerRegExp = /^(0|[1-9]\d*)$/;
        if (allIntegerKeys && integerRegExp.test(key)) {
          maxKey = Math.max(maxKey, Number(key));
        } else {
          allIntegerKeys = false;
        }
      });

      if (allIntegerKeys && maxKey < 2 * numKeys) {
        // convert to array.
        let array = [];
        _.forOwn(obj, (val, key) => {
          array[key] = val;
        });

        return array;
      }
      return obj;
    }

    exists(): boolean {
      return !_.isNull(this.val());
    }

    child(childPath?: string): DeltaSnapshot {
      if (!childPath) {
        return this;
      }
      return this._dup(this._isPrevious, childPath);
    }

    get previous(): DeltaSnapshot {
      return this._isPrevious ? this : this._dup(true);
    }

    get current(): DeltaSnapshot {
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

    private _dup(previous: boolean, childPath?: string): DeltaSnapshot {
      let dup = new DeltaSnapshot(this._apps);
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
}
