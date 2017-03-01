// The MIT License (MIT)
//
// Copyright (c) 2015 Firebase
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
import { Event, makeCloudFunction, MakeCloudFunctionArgs } from '../src/cloud-functions';

describe('makeCloudFunction', () => {
  const cloudFunctionArgs: MakeCloudFunctionArgs<any> = {
    provider: 'mock.provider',
    eventType: 'mock.event',
    resource: 'resource',
    handler: () => null,
  };

  it('should put a __trigger on the returned CloudFunction', () => {
    let cf = makeCloudFunction(cloudFunctionArgs);
    expect(cf.__trigger).to.deep.equal({
      eventTrigger: {
        eventType: 'providers/mock.provider/eventTypes/mock.event',
        resource: 'resource',
      },
    });
  });

  it('should preserve payload metadata', () => {
    let args: any = _.assign({}, cloudFunctionArgs, {handler: (e) => e});
    let cf = makeCloudFunction(args);
    let test: Event<string> = {
      eventId: '00000',
      timestamp: '2016-11-04T21:29:03.496Z',
      auth: {
        admin: true,
      },
      eventType: 'providers/provider/eventTypes/event',
      resource: 'resource',
      params: {
        foo: 'bar',
      },
      data: 'data',
    };

    return expect(cf(test)).to.eventually.deep.equal({
      eventId: '00000',
      timestamp: '2016-11-04T21:29:03.496Z',
      auth: {
        admin: true,
      },
      eventType: 'providers/provider/eventTypes/event',
      resource: 'resource',
      params: {
        foo: 'bar',
      },
      data: 'data',
    });
  });
});
