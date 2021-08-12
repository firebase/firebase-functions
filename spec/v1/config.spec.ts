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

import { expect } from 'chai';
import * as fs from 'fs';
import * as process from 'process';
import Sinon = require('sinon');

import * as config from '../../src/config';

describe('config()', () => {
  let readFileSync: Sinon.SinonStub;
  let cwdStub: Sinon.SinonStub;

  before(() => {
    readFileSync = Sinon.stub(fs, 'readFileSync');
    readFileSync.throws('Unexpected call');
    cwdStub = Sinon.stub(process, 'cwd');
    cwdStub.returns('/srv');
  });

  after(() => {
    Sinon.verifyAndRestore();
  });

  afterEach(() => {
    delete config.config.singleton;
    (config as any).firebaseConfigCache = null;
    delete process.env.FIREBASE_CONFIG;
    delete process.env.CLOUD_RUNTIME_CONFIG;
    delete process.env.K_CONFIGURATION;
  });

  it('will never load in GCFv2', () => {
    const json = JSON.stringify({
      foo: 'bar',
      firebase: {},
    });
    readFileSync
      .withArgs('/srv/.runtimeconfig.json')
      .returns(Buffer.from(json));

    process.env.K_CONFIGURATION = 'my-service';
    expect(() => config.config()).to.throw(
      Error,
      /transition to using environment variables/
    );
  });

  it('loads config values from .runtimeconfig.json', () => {
    const json = JSON.stringify({
      foo: 'bar',
      firebase: {},
    });
    readFileSync
      .withArgs('/srv/.runtimeconfig.json')
      .returns(Buffer.from(json));
    const loaded = config.config();
    expect(loaded).to.not.have.property('firebase');
    expect(loaded).to.have.property('foo', 'bar');
  });

  it('does not provide firebase config if .runtimeconfig.json not invalid', () => {
    readFileSync.withArgs('/srv/.runtimeconfig.json').returns('invalid JSON');
    expect(config.firebaseConfig()).to.be.null;
  });

  it('does not provide firebase config if .ruuntimeconfig.json has no firebase property', () => {
    readFileSync
      .withArgs('/srv/.runtimeconfig.json')
      .returns(Buffer.from('{}'));
    expect(config.firebaseConfig()).to.be.null;
  });

  it('loads Firebase configs from FIREBASE_CONFIG env variable', () => {
    process.env.FIREBASE_CONFIG = JSON.stringify({
      databaseURL: 'foo@firebaseio.com',
    });
    expect(config.firebaseConfig()).to.have.property(
      'databaseURL',
      'foo@firebaseio.com'
    );
  });

  it('loads Firebase configs from FIREBASE_CONFIG env variable pointing to a file', () => {
    const oldEnv = process.env;
    (process as any).env = {
      ...oldEnv,
      FIREBASE_CONFIG: '.firebaseconfig.json',
    };
    try {
      readFileSync.returns(
        Buffer.from('{"databaseURL": "foo@firebaseio.com"}')
      );
      expect(config.firebaseConfig()).to.have.property(
        'databaseURL',
        'foo@firebaseio.com'
      );
    } finally {
      (process as any).env = oldEnv;
    }
  });

  it('accepts alternative locations for config file', () => {
    process.env.CLOUD_RUNTIME_CONFIG = 'another.json';
    const json = JSON.stringify({ foo: 'bar', firebase: {} });
    readFileSync.withArgs('another.json').returns(Buffer.from(json));
    expect(config.firebaseConfig()).to.not.be.null;
    expect(config.config()).to.have.property('foo', 'bar');
  });

  it('accepts full JSON in env.CLOUD_RUNTIME_CONFIG', () => {
    process.env.CLOUD_RUNTIME_CONFIG = JSON.stringify({
      foo: 'bar',
      firebase: {},
    });
    expect(config.firebaseConfig()).to.not.be.null;
    expect(config.config()).to.have.property('foo', 'bar');
  });
});
