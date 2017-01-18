import * as _ from 'lodash';
import * as nock from 'nock';
import * as Promise from 'bluebird';

import { Credential } from '../src/credential';
import { AbstractEnv, RuntimeConfigEnv } from '../src/env';
import { expect } from 'chai';
import { async } from './support/helpers';
import { mockRCVariableFetch, mockMetaVariableWatch, mockMetaVariableWatchTimeout } from './fixtures/http';

describe('AbstractEnv', () => {
  let subject: AbstractEnv;
  beforeEach(() => {
    subject = new AbstractEnv();
  });

  describe('#_wrapHandler(handler: FunctionHandler, event: string)', () => {
    it('should not call before ready', () => {
      let called = false;
      subject.ready().then(() => called = true);
      return async().then(() => {
        expect(called).to.eq(false);
      });
    });

    it('should call when _notifyReady() has been called', () => {
      let called = false;
      subject.ready().then(() => {
        called = true;
      });
      subject['_notifyReady']();

      return async().then(() => {
        expect(called).to.eq(true);
      });
    });
  });

  describe('#data', () => {
    it('should throw an unimplemented error', () => {
      expect(() => {
        // tslint:disable-next-line
        subject.data;
      }).to.throw('unimplemented data getter in environment');
    });
  });
});

describe('RuntimeConfigEnv', () => {
  let subject: RuntimeConfigEnv;
  let nocks: nock.Scope[];

  beforeEach(() => {
    nocks = [];
  });

  afterEach(() => {
    nocks.forEach(n => n.done());
  });

  describe('with a null credential', () => {
    beforeEach(() => {
      subject = new RuntimeConfigEnv(null, 'example');
    });

    describe('#data', () => {
      it('throws an error if not ready', () => {
        expect(() => {
          _.noop(new RuntimeConfigEnv(null, null).data);
        }).to.throw('cannot access env before it is ready');
      });

      it('combines user and reserved data to create returned value w/ reserved precedence', () => {
        subject['_ready'] = true;
        subject['_custom'] = {foo: 'bar', baz: 'qux'};
        subject['_reserved'] = {foo: 'rab'};
        expect(subject.data).to.deep.equal({
          foo: 'rab',
          baz: 'qux',
        });
      });

      it('returns a memoized env value if ready and available', () => {
        let val = {memoized: true};
        subject['_ready'] = true;
        subject['_merged'] = val;
        expect(subject.data).to.deep.equal(val);
      });
    });
  });

  describe('with a stub credential', () => {
    let stubCredential: Credential = {
      getAccessToken: () => {
        return Promise.resolve({
          expires_in: 3600,
          access_token: 'thetoken',
        });
      },
      getCertificate: () => null,
    };

    beforeEach(() => {
      subject = new RuntimeConfigEnv(stubCredential, 'example');
    });

    it('should default to v0 (empty) if meta does not contain a version', () => {
      nocks.push(mockMetaVariableWatch('example', {reserved: {foo: 'bar'}}));
      mockMetaVariableWatchTimeout('example', 10000);
      return subject.ready().then(() => {
        expect(subject.data).to.deep.equal({foo: 'bar', firebase: {credential: stubCredential}});
        expect(subject.version).to.equal('v0');
      });
    });

    it('should fetch the version specified by meta', () => {
      nocks.push(mockMetaVariableWatch('example', {version: 'v1'}));
      nocks.push(mockRCVariableFetch('example', 'v1', {foo: 'bar'}));
      mockMetaVariableWatchTimeout('example', 10000);
      return subject.ready().then(() => {
        expect(subject.data).to.deep.equal({foo: 'bar', firebase: {credential: stubCredential}});
      });
    });

    it('should use "latest" from meta if available', () => {
      nocks.push(mockMetaVariableWatch('example', {version: 'v1', latest: {foo: 'bar', baz: 'qux'}}));
      mockMetaVariableWatchTimeout('example', 10000);
      return subject.ready().then(() => {
        expect(subject.data['foo']).to.equal('bar');
        expect(subject.data['baz']).to.equal('qux');
      });
    });

    it('should merge in reserved data returned by meta', () => {
      nocks.push(mockMetaVariableWatch('example', {version: 'v1', reserved: {foo: 'bar'}}));
      nocks.push(mockRCVariableFetch('example', 'v1', {baz: 'qux'}));
      mockMetaVariableWatchTimeout('example', 10000);
      return subject.ready().then(() => {
        expect(subject.data).to.deep.equal({
          foo: 'bar',
          baz: 'qux',
          firebase: {credential: stubCredential},
        });
      });
    });
  });
});

describe('AbstractEnv', () => {
  let subject: AbstractEnv;
  beforeEach(() => {
    subject = new AbstractEnv();
  });

  describe('#_wrapHandler(handler: FunctionHandler, event: string)', () => {
    it('should not call before ready', () => {
      let called = false;
      subject.ready().then(() => called = true);
    });

    it('should call when _notifyReady() has been called', () => {
      let called = false;
      subject.ready().then(() => {
        called = true;
      });
      subject['_notifyReady']();
      return async().then(() => {
        expect(called).to.eq(true);
      });
    });
  });

  describe('#data', () => {
    it('should throw an unimplemented error', () => {
      expect(() => {
        // tslint:disable-next-line
        subject.data;
      }).to.throw('Firebase: unimplemented data getter in environment');
    });
  });

  describe('#data', () => {
    it('should throw an unimplemented error', () => {
      expect(() => {
        // tslint:disable-next-line
        subject.data;
      }).to.throw('Firebase: unimplemented data getter in environment');
    });
  });
});

describe('RuntimeConfigEnv', () => {
  xit('does stuff');
});
