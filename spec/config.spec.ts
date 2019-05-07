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
import { config, firebaseConfig } from '../src/config';

const NODE8_NODE10_PATH = '/srv/.runtimeconfig.json';
const NODE6_PATH = '/user_code/.runtimeconfig.json';

describe('config()', () => {
  afterEach(() => {
    mockRequire.stopAll();
    delete config.singleton;
    delete process.env.FIREBASE_CONFIG;
    delete process.env.PWD;
  });

  it('loads Firebase config from FIREBASE_CONFIG env variable', () => {
    process.env.FIREBASE_CONFIG = JSON.stringify({
      databaseURL: 'foo@firebaseio.com',
    });

    expect(firebaseConfig()).to.have.property(
      'databaseURL',
      'foo@firebaseio.com'
    );
  });

  it('does not provide firebase config if .runtimeconfig.json is invalid', () => {
    mockRequire(NODE8_NODE10_PATH, 'does-not-exist');

    expect(firebaseConfig()).to.be.null;
  });

  it('does not provide firebase config if .runtimeconfig.json has no firebase property', () => {
    mockRequire(NODE8_NODE10_PATH, {});

    expect(firebaseConfig()).to.be.null;
  });

  it('loads firebase config from .runtimeconfig.json properly for Node 6 functions', () => {
    process.env.PWD = '/user_code';
    mockRequire(NODE6_PATH, {
      foo: 'bar',
      firebase: {
        projectId: 'chenky-test',
        databaseURL: 'https://chenky-test.firebaseio.com',
        storageBucket: 'chenky-test.appspot.com',
        cloudResourceLocation: 'us-central',
      },
    });

    let loaded = firebaseConfig();

    expect(loaded).to.have.keys(
      'projectId',
      'databaseURL',
      'storageBucket',
      'cloudResourceLocation'
    );
  });

  it('loads firebase config from .runtimeconfig.json properly for Node 8 functions', () => {
    process.env.PWD = '/srv';
    mockRequire(NODE8_NODE10_PATH, {
      foo: 'bar',
      firebase: {
        projectId: 'chenky-test',
        databaseURL: 'https://chenky-test.firebaseio.com',
        storageBucket: 'chenky-test.appspot.com',
        cloudResourceLocation: 'us-central',
      },
    });

    let loaded = firebaseConfig();

    expect(loaded).to.have.keys(
      'projectId',
      'databaseURL',
      'storageBucket',
      'cloudResourceLocation'
    );
  });

  it('loads firebase config from .runtimeconfig.json properly for Node 10 functions', () => {
    process.env.PWD = '/srv/functions';
    mockRequire(NODE8_NODE10_PATH, {
      foo: 'bar',
      firebase: {
        projectId: 'chenky-test',
        databaseURL: 'https://chenky-test.firebaseio.com',
        storageBucket: 'chenky-test.appspot.com',
        cloudResourceLocation: 'us-central',
      },
    });

    let loaded = firebaseConfig();

    expect(loaded).to.have.keys(
      'projectId',
      'databaseURL',
      'storageBucket',
      'cloudResourceLocation'
    );
  });

  it('loads config values from .runtimeconfig.json properly for Node 6 functions', () => {
    process.env.PWD = '/user_code';
    mockRequire(NODE6_PATH, { foo: 'bar', firebase: {} });

    let loaded = config();

    expect(loaded).to.not.have.property('firebase');
    expect(loaded).to.have.property('foo', 'bar');
  });

  it('loads config values from .runtimeconfig.json properly for Node 8 functions', () => {
    process.env.PWD = '/srv';
    mockRequire(NODE8_NODE10_PATH, { foo: 'bar', firebase: {} });

    let loaded = config();

    expect(loaded).to.not.have.property('firebase');
    expect(loaded).to.have.property('foo', 'bar');
  });

  it('loads config values from .runtimeconfig.json properly for Node 10 functions', () => {
    process.env.PWD = '/srv/functions';
    mockRequire(NODE8_NODE10_PATH, { foo: 'bar', firebase: {} });
    
    let loaded = config();

    expect(loaded).to.not.have.property('firebase');
    expect(loaded).to.have.property('foo', 'bar');
  });
});
