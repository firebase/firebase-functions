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

import * as _ from 'lodash';
import { expect } from 'chai';
import { Event, LegacyEvent, makeCloudFunction, MakeCloudFunctionArgs, Change } from '../src/cloud-functions';

describe('makeCloudFunction', () => {
  const cloudFunctionArgs: MakeCloudFunctionArgs<any> = {
    provider: 'mock.provider',
    eventType: 'mock.event',
    service: 'service',
    triggerResource: () => 'resource',
    handler: () => null,
  };

  it('should put a __trigger on the returned CloudFunction', () => {
    let cf = makeCloudFunction(cloudFunctionArgs);
    expect(cf.__trigger).to.deep.equal({
      eventTrigger: {
        eventType: 'mock.provider.mock.event',
        resource: 'resource',
        service: 'service',
      },
    });
  });

  it('should construct the right context for legacy event format', () => {
    let args: any = _.assign({}, cloudFunctionArgs, {handler: (data, context) => context});
    let cf = makeCloudFunction(args);
    let test: LegacyEvent = {
      eventId: '00000',
      timestamp: '2016-11-04T21:29:03.496Z',
      eventType: 'providers/provider/eventTypes/event',
      resource: 'resource',
      data: 'data',
    };

    return expect(cf(test)).to.eventually.deep.equal({
      eventId: '00000',
      timestamp: '2016-11-04T21:29:03.496Z',
      eventType: 'mock.provider.mock.event',
      resource: {
        service: 'service',
        name: 'resource',
      },
      params: {},
    });
  });

  it('should construct the right context for new event format', () => {
    let args: any = _.assign({}, cloudFunctionArgs, { handler: (data, context) => context });
    let cf = makeCloudFunction(args);
    let test: Event = {
      context: {
        eventId: '00000',
        timestamp: '2016-11-04T21:29:03.496Z',
        eventType: 'provider.event',
        resource: {
          service: 'provider',
          name: 'resource',
        },
      },
      data: 'data',
    };

    return expect(cf(test)).to.eventually.deep.equal({
      eventId: '00000',
      timestamp: '2016-11-04T21:29:03.496Z',
      eventType: 'provider.event',
      resource: {
        service: 'provider',
        name: 'resource',
      },
      params: {},
    });
  });
});

describe('makeParams', () => {
  const args: MakeCloudFunctionArgs<any> = {
    provider: 'provider',
    eventType: 'event',
    service: 'service',
    triggerResource: () => 'projects/_/instances/pid/ref/{foo}/nested/{bar}',
    handler: (data, context) => context.params,
  };
  const cf = makeCloudFunction(args);

  it('should construct params from the event resource of legacy events', () => {
    const testEvent: LegacyEvent = {
      resource: 'projects/_/instances/pid/ref/a/nested/b',
      eventType: 'event',
      data: 'data',
    };

    return expect(cf(testEvent)).to.eventually.deep.equal({
      foo: 'a',
      bar: 'b',
    });
  });

  it('should construct params from the event resource of new format events', () => {
    const testEvent: Event = {
      context: {
        eventId: '111',
        timestamp: '2016-11-04T21:29:03.496Z',
        resource: {
          service: 'service',
          name: 'projects/_/instances/pid/ref/a/nested/b',
        },
        eventType: 'event',
      },
      data: 'data',
    };

    return expect(cf(testEvent)).to.eventually.deep.equal({
      foo: 'a',
      bar: 'b',
    });
  });
});

describe('makeAuth and makeAuthType', () => {
  const args: MakeCloudFunctionArgs<any> = {
    provider: 'google.firebase.database',
    eventType: 'event',
    service: 'service',
    triggerResource: () => 'projects/_/instances/pid/ref/{foo}/nested/{bar}',
    handler: (data, context) => {
      return {
        auth: context.auth,
        authMode: context.authType,
      };
    },
  };
  let cf = makeCloudFunction(args);

  it('should construct correct auth and authType for admin user', () => {
    const testEvent: LegacyEvent = {
      data: 'data',
      auth: {
        admin: true,
      },
    };

    return expect(cf(testEvent)).to.eventually.deep.equal({
      auth: undefined,
      authMode: 'ADMIN',
    });
  });

  it('should construct correct auth and authType for unauthenticated user', () => {
    const testEvent: LegacyEvent = {
      data: 'data',
      auth: {
        admin: false,
      },
    };

    return expect(cf(testEvent)).to.eventually.deep.equal({
      auth: null,
      authMode: 'UNAUTHENTICATED',
    });
  });

  it('should construct correct auth and authType for a user', () => {
    const testEvent: LegacyEvent = {
      data: 'data',
      auth: {
        admin: false,
        variable: {
          uid: 'user',
          provider: 'google',
          token: {
            sub: 'user',
          },
        },
      },
    };

    return expect(cf(testEvent)).to.eventually.deep.equal({
      auth: {
        uid: 'user',
        token: {
          sub: 'user',
        },
      },
      authMode: 'USER',
    });
  });
});

describe('Change', () => {
  describe('applyFieldMask', () => {
    const after = {
      foo: 'bar',
      num: 2,
      obj: {
        a: 1,
        b: 2,
      },
    };

    it('should handle deleted values', () => {
      const sparseBefore = { baz: 'qux' };
      const fieldMask = 'baz';
      expect(Change.applyFieldMask(sparseBefore, after, fieldMask)).to.deep.equal( {
        foo: 'bar',
        num: 2,
        obj: {
          a: 1,
          b: 2,
        },
        baz: 'qux',
      });
    });

    it('should handle created values', () => {
      const sparseBefore = {};
      const fieldMask = 'num,obj.a';
      expect(Change.applyFieldMask(sparseBefore, after, fieldMask)).to.deep.equal({
        foo: 'bar',
        obj: {
          b: 2,
        },
      });
    });

    it('should handle mutated values', () => {
      const sparseBefore = {
        num: 3,
        obj: {
          a: 3,
        },
      };
      const fieldMask = 'num,obj.a';
      expect(Change.applyFieldMask(sparseBefore, after, fieldMask)).to.deep.equal({
        foo: 'bar',
        num: 3,
        obj: {
          a: 3,
          b: 2,
        },
      });
    });
  });

  describe('fromJSON', () => {
    it('should create a Change object with a `before` and `after`', () => {
      let created = Change.fromJSON<any>({
        before: { foo: 'bar' },
        after: { foo: 'faz' },
      });
      expect(created instanceof Change).to.equal(true);
      expect(created.before).to.deep.equal({ foo: 'bar' });
      expect(created.after).to.deep.equal({ foo: 'faz' });
    });

    it('should apply the customizer function to `before` and `after`', () => {
      function customizer<T>(input) {
        _.set(input, 'another', 'value');
        return input;
      }
      let created = Change.fromJSON<Object>(
        {
          before: { foo: 'bar' },
          after: { foo: 'faz' },
        },
        customizer,
      );
      expect(created.before).to.deep.equal({
        foo: 'bar',
        another: 'value',
      });
      expect(created.after).to.deep.equal({
        foo: 'faz',
        another: 'value',
      });
    });
  });
});
