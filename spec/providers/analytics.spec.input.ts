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

/* tslint:disable:max-line-length */
import { AnalyticsEvent } from '../../src/providers/analytics';

// A payload, as it might arrive over the wire. Every possible field is filled out at least once.
export const fullPayload = JSON.parse(`{
  "data": {
    "@type": "type.googleapis.com/google.firebase.analytics.functions.v1.AnalyticsEvent",
    "eventDim":
    [
      {
        "date": "20170202",
        "name": "Loaded_In_Background",
        "params": {
          "build": {
            "stringValue": "1350"
          },
          "calls_remaining": {
            "intValue": "10"
          },
          "fraction_calls_dropped": {
            "doubleValue": 0.0123456
          },
          "average_call_rating": {
            "floatValue": 4.5
          }
        },
        "previousTimestampMicros": "1486076479797000",
        "timestampMicros": "1486076786124987",
        "valueInUsd": 1234.5
      }
    ],
    "userDim": {
      "userId": "abcdefghijklmnop!",
      "appInfo": {
        "appId": "com.mobileday.MobileDay",
        "appInstanceId": "E3C9939401814B9B954725A740B8C7BC",
        "appPlatform": "IOS",
        "appStore": "iTunes",
        "appVersion": "5.2.0"
      },
      "trafficSource": {
        "userAcquiredSource": "Pizza Everywhere",
        "userAcquiredCampaign": "Functions launch party",
        "userAcquiredMedium": "Free food"
      },
      "bundleInfo": {
        "bundleSequenceId":6034,
        "serverTimestampOffsetMicros": "370987"
      },
      "deviceInfo": {
        "deviceCategory": "mobile",
        "deviceModel": "iPhone7,2",
        "deviceTimeZoneOffsetSeconds":-21600,
        "mobileBrandName": "Apple",
        "mobileMarketingName": "iPhone 6",
        "mobileModelName": "iPhone 6",
        "platformVersion": "10.2.1",
        "userDefaultLanguage": "en-us",
        "deviceId": "599F9C00-92DC-4B5C-9464-7971F01F8370",
        "resettableDeviceId": "599F9C00-92DC-4B5C-9464-7971F01F8370",
        "limitedAdTracking": true
      },
      "firstOpenTimestampMicros": "1461855635819000",
      "geoInfo": {
        "city": "Plano",
        "continent": "021",
        "country": "United States",
        "region": "Texas"
      },
      "userProperties": {
        "build": {
          "setTimestampUsec": "1486076786090987",
          "value": {
            "stringValue": "1350"
          },
          "index": 1
        },
        "calls_remaining": {
          "setTimestampUsec": "1486076786094987",
          "value": {
            "stringValue": "10"
          },
          "index": 2
        },
        "version": {
          "setTimestampUsec": "1486076786085987",
          "value": {
            "stringValue": "5.2.0"
          }
        }
      },
      "ltvInfo": {
        "revenue": 133.7,
        "currency": "USD"
      }
    }
  },
  "context": {
    "eventId": "1486080145623867projects/analytics-integration-fd82a/events/i_made_this_upproviders/google.firebase.analytics/eventTypes/event.sendprojects/f949d1bb9ef782579-tp/topics/cloud-functions-u54ejabpzs4prfjh7433eklhae",
    "eventType": "providers/google.firebase.analytics/eventTypes/event.send",
    "timestamp": "2017-03-29T23:59:59.986371388Z",
    "resource": {
      "service": "app-measurement.com",
      "name": "projects/analytics-integration-fd82a/events/i_made_this_up"
    }
  }
}`);

// The event data that we expect would be constructed if the payload above were to arrive.
export const data: AnalyticsEvent = {
  reportingDate: '20170202',
  name: 'Loaded_In_Background',
  params: {
    build: '1350',
    calls_remaining: 10,
    fraction_calls_dropped: 0.0123456,
    average_call_rating: 4.5,
  },
  logTime: '2017-02-02T23:06:26.124Z',
  previousLogTime: '2017-02-02T23:01:19.797Z',
  valueInUSD: 1234.5,
  user: {
    userId: 'abcdefghijklmnop!',
    appInfo: {
      appId: 'com.mobileday.MobileDay',
      appInstanceId: 'E3C9939401814B9B954725A740B8C7BC',
      appPlatform: 'IOS',
      appStore: 'iTunes',
      appVersion: '5.2.0',
    },
    bundleInfo: {
      bundleSequenceId: 6034,
      serverTimestampOffset: 371,
    },
    deviceInfo: {
      deviceCategory: 'mobile',
      deviceModel: 'iPhone7,2',
      deviceTimeZoneOffsetSeconds: -21600,
      mobileBrandName: 'Apple',
      mobileMarketingName: 'iPhone 6',
      mobileModelName: 'iPhone 6',
      platformVersion: '10.2.1',
      userDefaultLanguage: 'en-us',
      deviceId: '599F9C00-92DC-4B5C-9464-7971F01F8370',
      resettableDeviceId: '599F9C00-92DC-4B5C-9464-7971F01F8370',
      limitedAdTracking: true,
    },
    firstOpenTime: '2016-04-28T15:00:35.819Z',
    geoInfo: {
      city: 'Plano',
      continent: '021',
      country: 'United States',
      region: 'Texas',
    },
    userProperties: {
      build: {
        setTime: '2017-02-02T23:06:26.090Z',
        value: '1350',
      },
      calls_remaining: {
        setTime: '2017-02-02T23:06:26.094Z',
        value: '10',
      },
      version: {
        setTime: '2017-02-02T23:06:26.085Z',
        value: '5.2.0',
      },
    },
  },
};
