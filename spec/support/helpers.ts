import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { env } from '../../src/env';

export class FakeEnv extends env.AbstractEnv {
  private _data: env.Data;

  constructor(data?: env.Data) {
    super();
    this._data = _.extend({}, data, {
      firebase: {
        credential: {
          getAccessToken: () => {
            return Promise.resolve('fakeToken');
          },
        },
      },
    });
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
