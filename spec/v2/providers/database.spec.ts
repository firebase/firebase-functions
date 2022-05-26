// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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
import * as database from '../../../src/v2/providers/database';

const RAW_RTDB_EVENT: database.RawRTDBCloudEvent = {
  data: {
    ['@type']:
      'type.googleapis.com/google.events.firebase.database.v1.ReferenceEventData',
    data: {},
    delta: {},
  },
  firebasedatabasehost: 'firebaseio.com',
  instance: 'my-instance',
  ref: 'foo/bar',
  location: 'us-central1',
  id: 'id',
  source: 'source',
  specversion: '1.0',
  time: 'time',
  type: 'type',
};

describe('matchParams', () => {
  it('should parse without multi segment', () => {
    const params = {};

    database.matchParams(
      '{a}/something/else/{b}/end/{c}'.split('/'),
      ['{a}', '{b}', '{c}'],
      'match_a/something/else/match_b/end/match_c'.split('/'),
      params
    );

    expect(params).to.deep.equal({
      a: 'match_a',
      b: 'match_b',
      c: 'match_c',
    });
  });

  it('should parse multi segment with params after', () => {
    const params = {};

    database.matchParams(
      'something/**/else/{a}/hello/{b}/world'.split('/'),
      ['{a}', '{b}'],
      'something/is/a/thing/else/nothing/hello/user/world'.split('/'),
      params
    );

    expect(params).to.deep.equal({
      a: 'nothing',
      b: 'user',
    });
  });

  it('should parse multi segment param with params after', () => {
    const params = {};

    database.matchParams(
      'something/{path=**}/else/{a}/hello/{b}/world'.split('/'),
      ['{path=**}', '{a}', '{b}'],
      'something/is/a/thing/else/nothing/hello/user/world'.split('/'),
      params
    );

    expect(params).to.deep.equal({
      path: 'is/a/thing',
      a: 'nothing',
      b: 'user',
    });
  });

  it('should parse multi segment with params before', () => {
    const params = {};

    database.matchParams(
      '{a}/something/{b}/**/end'.split('/'),
      ['{a}', '{b}'],
      'match_a/something/match_b/thing/else/nothing/hello/user/end'.split('/'),
      params
    );

    expect(params).to.deep.equal({
      a: 'match_a',
      b: 'match_b',
    });
  });

  it('should parse multi segment param with params before', () => {
    const params = {};

    database.matchParams(
      '{a}/something/{b}/{path=**}/end'.split('/'),
      ['{a}', '{b}', '{path=**}'],
      'match_a/something/match_b/thing/else/nothing/hello/user/end'.split('/'),
      params
    );

    expect(params).to.deep.equal({
      a: 'match_a',
      b: 'match_b',
      path: 'thing/else/nothing/hello/user',
    });
  });

  it('should parse multi segment with params before and after', () => {
    const params = {};

    database.matchParams(
      '{a}/something/**/{b}/end'.split('/'),
      ['{a}', '{b}'],
      'match_a/something/thing/else/nothing/hello/user/match_b/end'.split('/'),
      params
    );

    expect(params).to.deep.equal({
      a: 'match_a',
      b: 'match_b',
    });
  });

  it('should parse multi segment param with params before', () => {
    const params = {};

    database.matchParams(
      '{a}/something/{path=**}/{b}/end'.split('/'),
      ['{a}', '{path=**}', '{b}'],
      'match_a/something/thing/else/nothing/hello/user/match_b/end'.split('/'),
      params
    );

    expect(params).to.deep.equal({
      a: 'match_a',
      b: 'match_b',
      path: 'thing/else/nothing/hello/user',
    });
  });

  // handle an instance param
  it('should parse an instance', () => {
    const params = {};

    database.matchParams(
      ['{a}-something-{b}-else-{c}'],
      ['{a}', '{b}', '{c}'],
      ['match_a-something-match_b-else-match_c'],
      params
    );

    expect(params).to.deep.equal({});

    database.matchParams(['{a}'], ['{a}'], ['match_a'], params);

    expect(params).to.deep.equal({
      a: 'match_a',
    });
  });
});

describe('makeParams', () => {
  it('should make params with basic path', () => {
    const event: database.RawRTDBCloudEvent = {
      ...RAW_RTDB_EVENT,
      ref: 'match_a/something/else/nothing/end/match_b',
    };

    expect(
      database.makeParams(event, '{a}/something/else/*/end/{b}', '*')
    ).to.deep.equal({
      a: 'match_a',
      b: 'match_b',
    });
  });

  it('should make params with multi segment path', () => {
    const event: database.RawRTDBCloudEvent = {
      ...RAW_RTDB_EVENT,
      ref: 'something/is/a/thing/else/match_a/hello/match_b/world',
    };

    expect(
      database.makeParams(event, 'something/**/else/{a}/hello/{b}/world', '*')
    ).to.deep.equal({
      a: 'match_a',
      b: 'match_b',
    });
  });

  it('should make params with multi segment path capture', () => {
    const event: database.RawRTDBCloudEvent = {
      ...RAW_RTDB_EVENT,
      ref: 'something/is/a/thing/else/match_a/hello/match_b/world',
    };

    expect(
      database.makeParams(
        event,
        'something/{path=**}/else/{a}/hello/{b}/world',
        '*'
      )
    ).to.deep.equal({
      path: 'is/a/thing',
      a: 'match_a',
      b: 'match_b',
    });
  });

  it('should make params for a full path and instance', () => {
    const event: database.RawRTDBCloudEvent = {
      ...RAW_RTDB_EVENT,
      ref: 'something/is/a/thing/else/match_a/hello/match_b/world',
    };

    expect(
      database.makeParams(
        event,
        'something/{path=**}/else/{a}/hello/{b}/world',
        '{inst}'
      )
    ).to.deep.equal({
      path: 'is/a/thing',
      a: 'match_a',
      b: 'match_b',
      inst: 'my-instance',
    });
  });
});

describe('getOpts', () => {
  it('should return opts when passed in a path', () => {
    expect(database.getOpts('/foo/{bar}/')).to.deep.equal({
      path: 'foo/{bar}',
      instance: '*',
      opts: {},
    });
  });

  it('should return opts when passed in an options object', () => {
    expect(
      database.getOpts({
        ref: '/foo/{bar}/',
        instance: '{inst}',
        region: 'us-central1',
      })
    ).to.deep.equal({
      path: 'foo/{bar}',
      instance: '{inst}',
      opts: {
        region: 'us-central1',
      },
    });
  });
});

describe('onOperation', () => {
  it('should create a function for a written event', () => {
    const func = database.onOperation(
      database.writtenEventType,
      '/foo/{bar}/',
      (event) => 2,
      true
    );

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      labels: {},
      eventTrigger: {
        eventType: database.writtenEventType,
        eventFilters: {},
        eventFilterPathPatterns: {
          ref: 'foo/{bar}',
          instance: '*',
        },
        retry: false,
      },
    });
  });

  it('should create a function for a created event', () => {
    const func = database.onOperation(
      database.createdEventType,
      '/foo/{bar}/',
      (event) => 2,
      true
    );

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      labels: {},
      eventTrigger: {
        eventType: database.createdEventType,
        eventFilters: {},
        eventFilterPathPatterns: {
          ref: 'foo/{bar}',
          instance: '*',
        },
        retry: false,
      },
    });
  });

  it('should create a function for a updated event', () => {
    const func = database.onOperation(
      database.updatedEventType,
      '/foo/{bar}/',
      (event) => 2,
      true
    );

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      labels: {},
      eventTrigger: {
        eventType: database.updatedEventType,
        eventFilters: {},
        eventFilterPathPatterns: {
          ref: 'foo/{bar}',
          instance: '*',
        },
        retry: false,
      },
    });
  });

  it('should create a function for a deleted event', () => {
    const func = database.onOperation(
      database.deletedEventType,
      '/foo/{bar}/',
      (event) => 2,
      true
    );

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      labels: {},
      eventTrigger: {
        eventType: database.deletedEventType,
        eventFilters: {},
        eventFilterPathPatterns: {
          ref: 'foo/{bar}',
          instance: '*',
        },
        retry: false,
      },
    });
  });

  it('should create a complex function', () => {
    const func = database.onOperation(
      database.writtenEventType,
      {
        ref: '/foo/{path=**}/{bar}/',
        instance: 'my-instance',
        region: 'us-central1',
        cpu: 'gcf_gen1',
        minInstances: 2,
      },
      (event) => 2,
      true
    );

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      cpu: 'gcf_gen1',
      minInstances: 2,
      region: ['us-central1'],
      labels: {},
      eventTrigger: {
        eventType: database.writtenEventType,
        eventFilters: {
          instance: 'my-instance',
        },
        eventFilterPathPatterns: {
          ref: 'foo/{path=**}/{bar}',
        },
        retry: false,
      },
    });
  });
});

describe('onRefWritten', () => {
  it('should create a function with a reference', () => {
    const func = database.onRefWritten('/foo/{bar}/', (event) => 2);

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      labels: {},
      eventTrigger: {
        eventType: database.writtenEventType,
        eventFilters: {},
        eventFilterPathPatterns: {
          ref: 'foo/{bar}',
          instance: '*',
        },
        retry: false,
      },
    });
  });

  it('should create a function with opts', () => {
    const func = database.onRefWritten(
      {
        ref: '/foo/{path=**}/{bar}/',
        instance: 'my-instance',
        region: 'us-central1',
        cpu: 'gcf_gen1',
        minInstances: 2,
      },
      (event) => 2
    );

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      cpu: 'gcf_gen1',
      minInstances: 2,
      region: ['us-central1'],
      labels: {},
      eventTrigger: {
        eventType: database.writtenEventType,
        eventFilters: {
          instance: 'my-instance',
        },
        eventFilterPathPatterns: {
          ref: 'foo/{path=**}/{bar}',
        },
        retry: false,
      },
    });
  });
});

describe('onRefCreated', () => {
  it('should create a function with a reference', () => {
    const func = database.onRefCreated('/foo/{bar}/', (event) => 2);

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      labels: {},
      eventTrigger: {
        eventType: database.createdEventType,
        eventFilters: {},
        eventFilterPathPatterns: {
          ref: 'foo/{bar}',
          instance: '*',
        },
        retry: false,
      },
    });
  });

  it('should create a function with opts', () => {
    const func = database.onRefCreated(
      {
        ref: '/foo/{path=**}/{bar}/',
        instance: 'my-instance',
        region: 'us-central1',
        cpu: 'gcf_gen1',
        minInstances: 2,
      },
      (event) => 2
    );

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      cpu: 'gcf_gen1',
      minInstances: 2,
      region: ['us-central1'],
      labels: {},
      eventTrigger: {
        eventType: database.createdEventType,
        eventFilters: {
          instance: 'my-instance',
        },
        eventFilterPathPatterns: {
          ref: 'foo/{path=**}/{bar}',
        },
        retry: false,
      },
    });
  });
});

describe('onRefUpdated', () => {
  it('should create a function with a reference', () => {
    const func = database.onRefUpdated('/foo/{bar}/', (event) => 2);

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      labels: {},
      eventTrigger: {
        eventType: database.updatedEventType,
        eventFilters: {},
        eventFilterPathPatterns: {
          ref: 'foo/{bar}',
          instance: '*',
        },
        retry: false,
      },
    });
  });

  it('should create a function with opts', () => {
    const func = database.onRefUpdated(
      {
        ref: '/foo/{path=**}/{bar}/',
        instance: 'my-instance',
        region: 'us-central1',
        cpu: 'gcf_gen1',
        minInstances: 2,
      },
      (event) => 2
    );

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      cpu: 'gcf_gen1',
      minInstances: 2,
      region: ['us-central1'],
      labels: {},
      eventTrigger: {
        eventType: database.updatedEventType,
        eventFilters: {
          instance: 'my-instance',
        },
        eventFilterPathPatterns: {
          ref: 'foo/{path=**}/{bar}',
        },
        retry: false,
      },
    });
  });
});

describe('onRefDeleted', () => {
  it('should create a function with a reference', () => {
    const func = database.onRefDeleted('/foo/{bar}/', (event) => 2);

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      labels: {},
      eventTrigger: {
        eventType: database.deletedEventType,
        eventFilters: {},
        eventFilterPathPatterns: {
          ref: 'foo/{bar}',
          instance: '*',
        },
        retry: false,
      },
    });
  });

  it('should create a function with opts', () => {
    const func = database.onRefDeleted(
      {
        ref: '/foo/{path=**}/{bar}/',
        instance: 'my-instance',
        region: 'us-central1',
        cpu: 'gcf_gen1',
        minInstances: 2,
      },
      (event) => 2
    );

    expect(func.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      cpu: 'gcf_gen1',
      minInstances: 2,
      region: ['us-central1'],
      labels: {},
      eventTrigger: {
        eventType: database.deletedEventType,
        eventFilters: {
          instance: 'my-instance',
        },
        eventFilterPathPatterns: {
          ref: 'foo/{path=**}/{bar}',
        },
        retry: false,
      },
    });
  });
});
