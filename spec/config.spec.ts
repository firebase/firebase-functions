// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as mockRequire from 'mock-require';
import { expect } from 'chai';
import { config } from '../src/config';
import { unsetSingleton } from './support/helpers';

describe('config()', () => {

  afterEach(() => {
    mockRequire.stopAll();
    unsetSingleton();
    delete process.env.FIREBASE_PROJECT;
    delete process.env.CLOUD_RUNTIME_CONFIG;
  });

  it('loads config values from .runtimeconfig.json', () => {
    mockRequire('../../../.runtimeconfig.json', { foo: 'bar', firebase: {} });
    let loaded = config();
    expect(loaded).to.have.property('firebase');
    expect(loaded).to.have.property('foo','bar');
  });

  it('injects a Firebase credential', () => {
    mockRequire('../../../.runtimeconfig.json', { firebase: {} });
    expect(config()).to.deep.property('firebase.credential');
  });

  it('throws an error if .runtimeconfig.json not present', () => {
    mockRequire('../../../.runtimeconfig.json', 'does-not-exist');
    expect(config).to.throw('not available');
  });

  it('throws an error if Firebase configs not present', () => {
    mockRequire('../../../.runtimeconfig.json', {});
    expect(config).to.throw('Firebase config variables are not available.');
  });

  it('loads Firebase configs from FIREBASE_PROJECT env variable', () => {
    process.env.FIREBASE_PROJECT = JSON.stringify({
      databaseURL: 'foo@firebaseio.com',
    });
    let firebaseConfig = config().firebase;
    expect(firebaseConfig).to.have.property('databaseURL', 'foo@firebaseio.com');
  });

  it('behaves well when both FIREBASE_PROJECT and .runtimeconfig.json present', () => {
    process.env.FIREBASE_PROJECT = JSON.stringify({
      databaseURL: 'foo@firebaseio.com',
    });
    mockRequire('../../../.runtimeconfig.json', {
      firebase: {
        databaseURL: 'foo@firebaseio.com',
      },
      foo: 'bar',
    });
    let loaded = config();
    expect(loaded.firebase).to.have.property('databaseURL', 'foo@firebaseio.com');
    expect(loaded).to.have.property('foo', 'bar');
  });

  it('accepts alternative locations for config file', () => {
    process.env.CLOUD_RUNTIME_CONFIG = 'another.json';
    mockRequire('another.json', { foo: 'bar', firebase: {} });
    let loaded = config();
    expect(loaded).to.have.property('firebase');
    expect(loaded).to.have.property('foo','bar');
  });

  it('accepts full JSON in env.CLOUD_RUNTIME_CONFIG', () => {
    process.env.CLOUD_RUNTIME_CONFIG = JSON.stringify({foo: 'bar', firebase:{} });
    let loaded = config();
    expect(loaded).to.have.property('firebase');
    expect(loaded).to.have.property('foo', 'bar');
  });

  it('behaves well when both env.CLOUD_RUNTIME_CONFIG and env.FIREBASE_PROJECT are set', () => {
    process.env.CLOUD_RUNTIME_CONFIG = JSON.stringify({ foo: 'bar' });
    process.env.FIREBASE_PROJECT = JSON.stringify({
      databaseURL: 'foo@firebaseio.com',
    });
    let loaded = config();
    expect(loaded.firebase).to.have.property('databaseURL', 'foo@firebaseio.com');
    expect(loaded).to.have.property('foo', 'bar');
  });
});
