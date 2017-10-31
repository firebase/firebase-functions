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

import * as crashlytics from '../../src/providers/crashlytics';
import { config } from '../../src/index';
import { apps as appsNamespace } from '../../src/apps';
import { expect } from 'chai';
import { fakeConfig } from '../support/helpers';

describe('Crashlytics Functions', () => {
  before(() => {
    config.singleton = fakeConfig();
    appsNamespace.init(config.singleton);
    process.env.GCLOUD_PROJECT = 'project1';
  });

  after(() => {
    delete appsNamespace.singleton;
    delete config.singleton;
    delete process.env.GCLOUD_PROJECT;
  });

  describe('#onNewDetected', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      const cloudFunction = crashlytics.issue().onNewDetected((event) => null);
      expect(cloudFunction.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/firebase.crashlytics/eventTypes/issue.new',
          resource: 'projects/project1',
        },
      });
    });
  });

  describe('#onRegressed', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      const cloudFunction = crashlytics.issue().onRegressed((event) => null);
      expect(cloudFunction.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/firebase.crashlytics/eventTypes/issue.regressed',
          resource: 'projects/project1',
        },
      });
    });
  });

  describe('#onVelocityAlert', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      const cloudFunction = crashlytics.issue().onVelocityAlert((event) => null);
      expect(cloudFunction.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/firebase.crashlytics/eventTypes/issue.velocityAlert',
          resource: 'projects/project1',
        },
      });
    });
  });
});
