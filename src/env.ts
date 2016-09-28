import * as _ from 'lodash';
import * as request from 'request-promise';
import * as Promise from 'bluebird';

import { Credential } from './credential';

export interface FirebaseEnv {
  data: FirebaseEnvData;
  ready(): PromiseLike<any>;
}

export interface FirebaseEnvData {
  [key: string]: any;
}

interface FirebaseEnvMetadata {
  version: string;
  reserved?: FirebaseEnvData;
}

export class AbstractEnv implements FirebaseEnv {
  protected _ready: boolean;
  protected _readyError: any;
  protected _readyListeners: { resolve: Function, reject: Function }[];

  constructor() {
    this._readyListeners = [];
  }

  ready(): PromiseLike<any> {
    if (this._ready) {
      return this._readyError ? Promise.reject(this._readyError) : Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this._readyListeners.push({ resolve, reject });
    });
  }

  get data(): FirebaseEnvData {
    throw new Error('Firebase: unimplemented data getter in environment');
  }

  protected _notifyReady(err?: any) {
    this._ready = true;
    while (this._readyListeners.length) {
      let listener = this._readyListeners.shift();
      err ? listener.reject(err) : listener.resolve();
    }
  }
}

export class RuntimeConfigEnv extends AbstractEnv {
  credential: Credential;
  lastUpdated: string;
  projectId: string;
  version: string;
  private _custom: FirebaseEnvData;
  private _reserved: FirebaseEnvData;
  private _merged: FirebaseEnvData;
  private _watching: boolean;

  constructor(credential, projectId) {
    super();
    [this.credential, this.projectId, this.lastUpdated] = [credential, projectId, new Date(0).toISOString()];
    if (this.credential && this.projectId) {
      this.watch();
    }
  }

  private request(options: request.Options): PromiseLike<any> {
    return this.credential.getAccessToken().then(tokenResponse => {
      options.headers = options.headers || {};
      _.assign(options.headers, {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      });

      return request(options);
    });
  }

  private watch() {
    if (!this._watching) {
      this._watching = true;
      return this.request({
        method: 'POST',
        url: `${this.varurl('meta')}:watch`,
        body: {
          newerThan: this.lastUpdated,
        },
        json: true,
        timeout: 65000, // watch times out in 60s
      }).then(response => {
        if (response.state === 'UPDATED') {
          // response is a JSON object with JSON encoded in the "text" field
          this._meta = JSON.parse(response.text);
          this.lastUpdated = response.updateTime;

          console.log(`Firebase: detected new environment version ${this.version}, fetching...`);
          this.fetch();
        } else if (response.state === 'DELETED') {
          this._custom = {};
          this.version = null;
          this.lastUpdated = response.updateTime;
        }
      }, err => {
        if (_.get(err, 'response.statusCode') === 502) {
          return Promise.resolve();
        }

        return Promise.reject(err);
      }).then(() => {
        this._watching = false;
        this.watch();
      });
    }
  }

  private fetch(): PromiseLike<FirebaseEnv> {
    return this.fetchVar(this.version).then((data: FirebaseEnvData) => {
      console.log('Firebase: updated environment configuration, now using', this.version);
      this._merged = null;
      this._custom = data || {};
      this._notifyReady();
      return this._custom;
    }, err => {
      console.warn('Firebase: error fetching environment configuration. Error:', err.stack);
      this._merged = null;
      this._custom = {};
      this._notifyReady(err);
      return this._custom;
    });
  }

  private fetchVar(name: string): PromiseLike<any> {
    if (name === 'v0') {
      return Promise.resolve({});
    }

    return this.request({
      method: 'GET',
      url: this.varurl(name),
      json: true,
    }).then(response => {
      try {
        return JSON.parse(response.text);
      } catch (e) {
        console.log('Firebase: invalid stored environment config content:', response.text);
        return null;
      }
    });
  }

  private set _meta(meta: FirebaseEnvMetadata) {
    this.version = meta.version || 'v0';
    this._reserved = meta.reserved || {};
    this._merged = null;
  }

  get data(): FirebaseEnvData {
    if (!this._ready) {
      throw new Error('Firebase: cannot access env before it is ready');
    } else if (this._merged) {
      return this._merged;
    }

    this._merged = _.assign({}, this._custom, this._reserved);
    return this._merged;
  }

  private varurl(name: string): string {
    return `https://runtimeconfig.googleapis.com/v1beta1/${this.varname(name)}`;
  }

  private varname(name: string): string {
    return `projects/${this.projectId}/configs/firebase/variables/${name}`;
  }
}
