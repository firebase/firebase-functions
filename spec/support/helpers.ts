import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { env } from '../../src/env';

export class FakeEnv extends env.AbstractEnv {
  private _data: env.Data;
  private oldSingleton = env.singleton;

  constructor(data?: env.Data) {
    super();
    this._data = _.extend({}, data, {
      firebase: {
        credential: {
          getAccessToken: () => {
            return Promise.resolve({
              expires_in: 1000,
              access_token: 'fake',
            });
          },
        },
      },
    });
  }

  stubSingleton() {
    env.singleton = this;
  }

  restoreSingleton() {
    env.singleton = this.oldSingleton;
  }

  makeReady() {
    this._notifyReady();
  }

  set data(data: env.Data) {
    this._data = data;
    this._notifyObservers(data);
  }

  get data() {
    return this._data;
  }
}
