import * as Promise from 'bluebird';
import { AbstractEnv, FirebaseEnvData } from '../../src/env';

export class FakeEnv extends AbstractEnv {
  private _data: FirebaseEnvData;

  constructor(data?: FirebaseEnvData) {
    super();
    this.data = data || {};
  }

  makeReady() {
    this._notifyReady();
  }

  set data(val: FirebaseEnvData) {
    this._data = val;
  }
}

export function async() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}
