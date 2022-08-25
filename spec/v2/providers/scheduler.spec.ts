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
import * as schedule from '../../../src/v2/providers/scheduler';

describe('schedule', () => {
  describe('getOpts', () => {
    it('should handle a schedule', () => {
      expect(schedule.getOpts('* * * * *')).to.deep.eq({
        schedule: '* * * * *',
        opts: {},
      });
    });

    it('should handle full options', () => {
      const options: schedule.ScheduleOptions = {
        schedule: '* * * * *',
        timeZone: 'utc',
        retryCount: 3,
        maxRetrySeconds: 1,
        minBackoffSeconds: 2,
        maxBackoffSeconds: 3,
        maxDoublings: 4,
        memory: '128MiB',
        region: 'us-central1',
      };

      expect(schedule.getOpts(options)).to.deep.eq({
        schedule: '* * * * *',
        timeZone: 'utc',
        retryCount: 3,
        maxRetrySeconds: 1,
        minBackoffSeconds: 2,
        maxBackoffSeconds: 3,
        maxDoublings: 4,
        opts: {
          ...options,
          memory: '128MiB',
          region: 'us-central1',
        },
      });
    });
  });

  describe('onSchedule', () => {
    it('should create a schedule function given a schedule', () => {
      const schfn = schedule.onSchedule('* * * * *', (event) => console.log(1));

      expect(schfn.__endpoint).to.deep.eq({
        platform: 'gcfv2',
        labels: {},
        scheduleTrigger: {
          schedule: '* * * * *',
          retryConfig: {},
        },
      });
      expect(schfn.__requiredAPIs).to.deep.eq([
        {
          api: 'cloudscheduler.googleapis.com',
          reason: 'Needed for scheduled functions.',
        },
      ]);
    });

    it('should create a schedule function given options', () => {
      const schfn = schedule.onSchedule(
        {
          schedule: '* * * * *',
          timeZone: 'utc',
          retryCount: 3,
          maxRetrySeconds: 10,
          minBackoffSeconds: 11,
          maxBackoffSeconds: 12,
          maxDoublings: 2,
          region: 'us-central1',
          labels: { key: 'val' },
        },
        (event) => {}
      );

      expect(schfn.__endpoint).to.deep.eq({
        platform: 'gcfv2',
        labels: { key: 'val' },
        region: ['us-central1'],
        scheduleTrigger: {
          schedule: '* * * * *',
          timeZone: 'utc',
          retryConfig: {
            retryCount: 3,
            maxRetrySeconds: 10,
            minBackoffSeconds: 11,
            maxBackoffSeconds: 12,
            maxDoublings: 2,
          },
        },
      });
      expect(schfn.__requiredAPIs).to.deep.eq([
        {
          api: 'cloudscheduler.googleapis.com',
          reason: 'Needed for scheduled functions.',
        },
      ]);
    });

    it('should have a .run method', () => {
      const testObj = {
        foo: 'bar',
      };
      const schfn = schedule.onSchedule('* * * * *', (event) => {
        testObj.foo = 'newBar';
      });

      schfn.run('input' as any);

      expect(testObj).to.deep.eq({
        foo: 'newBar',
      });
    });
  });
});
