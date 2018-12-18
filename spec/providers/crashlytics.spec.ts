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

import * as crashlytics from '../../src/providers/crashlytics';
import { apps as appsNamespace } from '../../src/apps';
import * as functions from '../../src/index';
import { Event } from '../../src/cloud-functions';

describe('Crashlytics Functions', () => {
  describe('Issue Builder', () => {
    before(() => {
      appsNamespace.init();
      process.env.GCLOUD_PROJECT = 'project1';
    });

    after(() => {
      delete appsNamespace.singleton;
      delete process.env.GCLOUD_PROJECT;
    });

    it('should allow both region and runtime options to be set', () => {
      let fn = functions
        .region('my-region')
        .runWith({
          timeoutSeconds: 90,
          memory: '256MB',
        })
        .crashlytics.issue()
        .onNew(issue => issue);

      expect(fn.__trigger.regions).to.deep.equal(['my-region']);
      expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(fn.__trigger.timeout).to.deep.equal('90s');
    });

    describe('#onNew', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        const cloudFunction = crashlytics.issue().onNew(data => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'providers/firebase.crashlytics/eventTypes/issue.new',
            resource: 'projects/project1',
            service: 'fabric.io',
          },
        });
      });
    });

    describe('#onRegressed', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        const cloudFunction = crashlytics.issue().onRegressed(data => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType:
              'providers/firebase.crashlytics/eventTypes/issue.regressed',
            resource: 'projects/project1',
            service: 'fabric.io',
          },
        });
      });
    });

    describe('#onVelocityAlert', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        const cloudFunction = crashlytics.issue().onVelocityAlert(data => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType:
              'providers/firebase.crashlytics/eventTypes/issue.velocityAlert',
            resource: 'projects/project1',
            service: 'fabric.io',
          },
        });
      });
    });

    describe('HandlerBuilder', () => {
      const testIssue = {
        issueId: '1234',
        issueTitle: 'testIssue',
        appInfo: {
          appName: 'My Awesome Test App',
          appPlatform: 'ios',
          appId: '9876',
          latestAppVersion: '1.2.3.4',
        },
        createTime: '2018-12-18T23:05:55+00:00',
      };

      describe('#onNew', () => {
        it('should return a CloudFunction with appropriate values', () => {
          const cloudFunction = functions.handler.crashlytics
            .issue()
            .onNew(testIssue => {
              return (
                testIssue.issueId + testIssue.issueTitle + testIssue.createTime
              );
            });
          expect(cloudFunction.__trigger).to.deep.equal({
            eventTrigger: {
              eventType: 'providers/firebase.crashlytics/eventTypes/issue.new',
              resource: null,
              service: 'fabric.io',
            },
          });
          const expected =
            testIssue.issueId + testIssue.issueTitle + testIssue.createTime;
          expect(cloudFunction.run(testIssue, null)).to.equal(expected);
        });
      });

      describe('#onRegressed', () => {
        it('should return a CloudFunction with appropriate values', () => {
          const cloudFunction = functions.handler.crashlytics
            .issue()
            .onRegressed(testIssue => {
              return (
                testIssue.issueId + testIssue.issueTitle + testIssue.createTime
              );
            });
          expect(cloudFunction.__trigger).to.deep.equal({
            eventTrigger: {
              eventType:
                'providers/firebase.crashlytics/eventTypes/issue.regressed',
              resource: null,
              service: 'fabric.io',
            },
          });
          const expected =
            testIssue.issueId + testIssue.issueTitle + testIssue.createTime;
          expect(cloudFunction.run(testIssue, null)).to.equal(expected);
        });
      });

      describe('#onVelocityAlert', () => {
        it('should return a CloudFunction with appropriate values', () => {
          const cloudFunction = functions.handler.crashlytics
            .issue()
            .onVelocityAlert(testIssue => {
              return (
                testIssue.issueId + testIssue.issueTitle + testIssue.createTime
              );
            });
          expect(cloudFunction.__trigger).to.deep.equal({
            eventTrigger: {
              eventType:
                'providers/firebase.crashlytics/eventTypes/issue.velocityAlert',
              resource: null,
              service: 'fabric.io',
            },
          });
          const expected =
            testIssue.issueId + testIssue.issueTitle + testIssue.createTime;
          expect(cloudFunction.run(testIssue, null)).to.equal(expected);
        });
      });
    });
  });

  describe('process.env.GCLOUD_PROJECT not set', () => {
    it('should not throw if __trigger is not accessed', () => {
      expect(() => crashlytics.issue().onNew(() => null)).to.not.throw(Error);
    });

    it('should throw if __trigger is accessed', () => {
      expect(() => crashlytics.issue().onNew(() => null).__trigger).to.throw(
        Error
      );
    });

    it('should not throw when #run is called', () => {
      let cf = crashlytics.issue().onNew(() => null);
      expect(cf.run).to.not.throw(Error);
    });
  });
});
