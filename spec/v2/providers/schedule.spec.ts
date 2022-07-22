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
import * as schedule from '../../../src/v2/providers/schedule';

describe('schedule', () => {
  describe('getOpts', () => {
    it('should handle a schedule', () => {
      expect(schedule.getOpts('* * * * *')).to.deep.eq({
        schedule: '* * * * *',
        opts: {},
      });
    });

    it('should handle full options', () => {
      expect(
        schedule.getOpts({
          schedule: '* * * * *',
          timeZone: 'utc',
          retryCount: 3,
          maxRetryDuration: '1',
          minBackoffDuration: '2',
          maxBackoffDuration: '3',
          maxDoublings: 4,
          memory: '128MiB',
          region: 'us-central1',
        })
      ).to.deep.eq({
        schedule: '* * * * *',
        timeZone: 'utc',
        retryCount: 3,
        maxRetryDuration: '1',
        minBackoffDuration: '2',
        maxBackoffDuration: '3',
        maxDoublings: 4,
        opts: {
          memory: '128MiB',
          region: 'us-central1',
        },
      });
    });
  });

  describe('onSchedule', () => {
    it('should create a schedule function given a schedule', () => {
      const schfn = schedule.onSchedule('* * * * *', (req) => 1);

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
      expect(schfn.run({} as any)).to.eq(1);
    });

    it('should create a schedule function given options', () => {
      const schfn = schedule.onSchedule(
        {
          schedule: '* * * * *',
          timeZone: 'utc',
          retryCount: 3,
          maxRetryDuration: '10',
          minBackoffDuration: '11',
          maxBackoffDuration: '12',
          maxDoublings: 2,
          region: 'us-central1',
          labels: { key: 'val' },
        },
        (req) => 1
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
            maxRetryDuration: '10',
            minBackoffDuration: '11',
            maxBackoffDuration: '12',
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
      expect(schfn.run({} as any)).to.eq(1);
    });
  });
});
