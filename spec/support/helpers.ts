import * as Promise from 'bluebird';
import { AbstractEnv, FirebaseEnvData } from '../../src/env';
import * as _ from 'lodash';

export class FakeEnv extends AbstractEnv {
  private _data: FirebaseEnvData;

  constructor(data?: FirebaseEnvData) {
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

  set data(val: FirebaseEnvData) {
    this._data = val;
  }

  get data() {
    return this._data;
  }
}

export function async() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}
