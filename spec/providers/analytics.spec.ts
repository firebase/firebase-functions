// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { expect } from 'chai';

import { Event, EventContext } from '../../src/cloud-functions';
import * as functions from '../../src/index';
import * as analytics from '../../src/providers/analytics';
import * as analytics_spec_input from './analytics.spec.input';

describe('Analytics Functions', () => {
  describe('EventBuilder', () => {
    before(() => {
      process.env.GCLOUD_PROJECT = 'project1';
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it('should allow both region and runtime options to be set', () => {
      const fn = functions
        .region('us-east1')
        .runWith({
          timeoutSeconds: 90,
          memory: '256MB',
        })
        .analytics.event('event')
        .onLog((event) => event);

      expect(fn.__trigger.regions).to.deep.equal(['us-east1']);
      expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(fn.__trigger.timeout).to.deep.equal('90s');
    });

    describe('#onLog', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        const cloudFunction = analytics.event('first_open').onLog(() => null);

        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType:
              'providers/google.firebase.analytics/eventTypes/event.log',
            resource: 'projects/project1/events/first_open',
            service: 'app-measurement.com',
          },
        });
      });
    });

    describe('#dataConstructor', () => {
      it('should handle an event with the appropriate fields', () => {
        const cloudFunction = analytics
          .event('first_open')
          .onLog(
            (data: analytics.AnalyticsEvent, context: EventContext) => data
          );

        // The event data delivered over the wire will be the JSON for an AnalyticsEvent:
        // https://firebase.google.com/docs/auth/admin/manage-users#retrieve_user_data
        const event: Event = {
          data: {
            userDim: {
              userId: 'hi!',
            },
          },
          context: {
            eventId: '70172329041928',
            timestamp: '2018-04-09T07:56:12.975Z',
            eventType:
              'providers/google.firebase.analytics/eventTypes/event.log',
            resource: {
              service: 'app-measurement.com',
              name: 'projects/project1/events/first_open',
            },
          },
        };

        return expect(
          cloudFunction(event.data, event.context)
        ).to.eventually.deep.equal({
          params: {},
          user: {
            userId: 'hi!',
            userProperties: {},
          },
        });
      });

      it('should remove xValues', () => {
        const cloudFunction = analytics
          .event('first_open')
          .onLog(
            (data: analytics.AnalyticsEvent, context: EventContext) => data
          );

        // Incoming events will have four kinds of "xValue" fields: "intValue",
        // "stringValue", "doubleValue" and "floatValue". We expect those to get
        // flattened away, leaving just their values.
        const event: Event = {
          data: {
            eventDim: [
              {
                date: '20170202',
                name: 'Loaded_In_Background',
                params: {
                  build: {
                    stringValue: '1350',
                  },
                  calls_remaining: {
                    intValue: '10',
                  },
                  goats_teleported: {
                    doubleValue: 1.1,
                  },
                  boat_boyancy: {
                    floatValue: 133.7,
                  },
                },
              },
            ],
            userDim: {
              userProperties: {
                foo: {
                  value: {
                    stringValue: 'bar',
                  },
                },
              },
            },
          },
          context: {
            eventId: '70172329041928',
            timestamp: '2018-04-09T07:56:12.975Z',
            eventType:
              'providers/google.firebase.analytics/eventTypes/event.log',
            resource: {
              service: 'app-measurement.com',
              name: 'projects/project1/events/first_open',
            },
          },
        };

        return expect(
          cloudFunction(event.data, event.context)
        ).to.eventually.deep.equal({
          reportingDate: '20170202',
          name: 'Loaded_In_Background',
          params: {
            build: '1350',
            calls_remaining: 10,
            goats_teleported: 1.1,
            boat_boyancy: 133.7,
          },
          user: {
            userProperties: {
              foo: {
                value: 'bar',
              },
            },
          },
        });
      });

      it('should change microsecond timestamps to ISO strings, and offsets to millis', () => {
        const cloudFunction = analytics
          .event('first_open')
          .onLog((data: analytics.AnalyticsEvent) => data);

        const event: Event = {
          data: {
            eventDim: [
              {
                date: '20170202',
                name: 'Loaded_In_Background',
                timestampMicros: '1489080600000000',
                previousTimestampMicros: '526657020000000',
              },
            ],
            userDim: {
              firstOpenTimestampMicros: '577978620000000',
              userProperties: {
                foo: {
                  setTimestampUsec: '514820220000000',
                },
              },
              bundleInfo: {
                serverTimestampOffsetMicros: 9876789,
              },
            },
          },
          context: {
            eventId: '70172329041928',
            timestamp: '2018-04-09T07:56:12.975Z',
            eventType:
              'providers/google.firebase.analytics/eventTypes/event.log',
            resource: {
              service: 'app-measurement.com',
              name: 'projects/project1/events/first_open',
            },
          },
        };

        return expect(
          cloudFunction(event.data, event.context)
        ).to.eventually.deep.equal({
          reportingDate: '20170202',
          name: 'Loaded_In_Background',
          params: {},
          logTime: '2017-03-09T17:30:00.000Z',
          previousLogTime: '1986-09-09T13:37:00.000Z',
          user: {
            firstOpenTime: '1988-04-25T13:37:00.000Z',
            userProperties: {
              foo: {
                setTime: '1986-04-25T13:37:00.000Z',
              },
            },
            bundleInfo: {
              serverTimestampOffset: 9877,
            },
          },
        });
      });

      it('should populate currency fields', () => {
        const cloudFunction = analytics
          .event('first_open')
          .onLog((data: analytics.AnalyticsEvent) => data);

        // Incoming events will have four kinds of "xValue" fields: "intValue",
        // "stringValue", "doubleValue" and "floatValue". We expect those to get
        // flattened away, leaving just their values.
        //
        // xValues in eventDim[...].params should also populate a 'rawValue' field
        // that always contains a string.
        //
        // Separately, the input has a number of microsecond timestamps that we'd
        // like to rename and scale down to milliseconds.
        const event: Event = {
          data: {
            eventDim: [
              {
                date: '20170202',
                name: 'Loaded_In_Background',
                valueInUsd: 123.4,
              },
            ],
          },
          context: {
            eventId: '70172329041928',
            timestamp: '2018-04-09T07:56:12.975Z',
            eventType:
              'providers/google.firebase.analytics/eventTypes/event.log',
            resource: {
              service: 'app-measurement.com',
              name: 'projects/project1/events/first_open',
            },
          },
        };

        return expect(
          cloudFunction(event.data, event.context)
        ).to.eventually.deep.equal({
          reportingDate: '20170202',
          name: 'Loaded_In_Background',
          params: {},
          valueInUSD: 123.4, // Field renamed Usd -> USD.
        });
      });

      it('should recognize all the fields the payload can contain', () => {
        const cloudFunction = analytics
          .event('first_open')
          .onLog((data: analytics.AnalyticsEvent) => data);
        // The payload in analytics_spec_input contains all possible fields at least once.
        const payloadData = analytics_spec_input.fullPayload.data;
        const payloadContext = analytics_spec_input.fullPayload.context;

        return expect(
          cloudFunction(payloadData, payloadContext)
        ).to.eventually.deep.equal(analytics_spec_input.data);
      });
    });
  });

  describe('handler namespace', () => {
    describe('#onLog', () => {
      it('should return an empty trigger', () => {
        const cloudFunction = functions.handler.analytics.event.onLog(
          () => null
        );
        expect(cloudFunction.__trigger).to.deep.equal({});
      });

      it('should handle an event with the appropriate fields', () => {
        const cloudFunction = functions.handler.analytics.event.onLog(
          (data: analytics.AnalyticsEvent, context: EventContext) => data
        );

        // The event data delivered over the wire will be the JSON for an AnalyticsEvent:
        // https://firebase.google.com/docs/auth/admin/manage-users#retrieve_user_data
        const event: Event = {
          data: {
            userDim: {
              userId: 'hi!',
            },
          },
          context: {
            eventId: '70172329041928',
            timestamp: '2018-04-09T07:56:12.975Z',
            eventType:
              'providers/google.firebase.analytics/eventTypes/event.log',
            resource: {
              service: 'app-measurement.com',
              name: 'projects/project1/events/first_open',
            },
          },
        };

        return expect(
          cloudFunction(event.data, event.context)
        ).to.eventually.deep.equal({
          params: {},
          user: {
            userId: 'hi!',
            userProperties: {},
          },
        });
      });
    });
  });

  describe('process.env.GCLOUD_PROJECT not set', () => {
    it('should not throw if __trigger is not accessed', () => {
      expect(() => analytics.event('event').onLog(() => null)).to.not.throw(
        Error
      );
    });

    it('should throw when trigger is accessed', () => {
      expect(
        () => analytics.event('event').onLog(() => null).__trigger
      ).to.throw(Error);
    });

    it('should not throw when #run is called', () => {
      const cf = analytics.event('event').onLog(() => null);

      expect(cf.run).to.not.throw(Error);
    });
  });
});
