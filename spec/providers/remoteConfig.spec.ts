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
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
import { expect } from 'chai';
import * as _ from 'lodash';

import {
  CloudFunction,
  Event,
  EventContext,
  TriggerAnnotated,
} from '../../src/cloud-functions';
import * as functions from '../../src/index';
import * as remoteConfig from '../../src/providers/remoteConfig';

describe('RemoteConfig Functions', () => {
  function constructVersion() {
    return {
      versionNumber: 1,
      updateTime: '2017-07-02T18:48:58.920638Z',
      updateUser: {
        name: 'Foo Bar',
        email: 'foobar@gmail.com',
      },
      description: 'test description',
      updateOrigin: 'CONSOLE',
      updateType: 'INCREMENTAL_UPDATE',
    };
  }

  describe('#onUpdate', () => {
    function expectedTrigger(): TriggerAnnotated {
      return {
        __trigger: {
          eventTrigger: {
            resource: 'projects/project1',
            eventType: 'google.firebase.remoteconfig.update',
            service: 'firebaseremoteconfig.googleapis.com',
          },
        },
      };
    }

    before(() => {
      process.env.GCLOUD_PROJECT = 'project1';
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it('should have the correct trigger', () => {
      const cloudFunction = remoteConfig.onUpdate(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(
        expectedTrigger().__trigger
      );
    });

    it('should allow both region and runtime options to be set', () => {
      const cloudFunction = functions
        .region('us-east1')
        .runWith({
          timeoutSeconds: 90,
          memory: '256MB',
        })
        .remoteConfig.onUpdate(() => null);

      expect(cloudFunction.__trigger.regions).to.deep.equal(['us-east1']);
      expect(cloudFunction.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(cloudFunction.__trigger.timeout).to.deep.equal('90s');
    });
  });

  describe('unwraps TemplateVersion', () => {
    let cloudFunctionUpdate: CloudFunction<remoteConfig.TemplateVersion>;
    let event: Event;

    before(() => {
      process.env.GCLOUD_PROJECT = 'project1';
      cloudFunctionUpdate = remoteConfig.onUpdate(
        (version: remoteConfig.TemplateVersion, context: EventContext) =>
          version
      );

      event = {
        data: constructVersion(),
        context: {
          eventId: '70172329041928',
          timestamp: '2018-04-09T07:56:12.975Z',
          eventType: 'google.firebase.remoteconfig.update',
          resource: {
            service: 'firebaseremoteconfig.googleapis.com',
            name: 'projects/project1',
          },
        },
      };
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it('should unwrap the version in the event', () => {
      return Promise.all([
        cloudFunctionUpdate(event.data, event.context).then(
          (data: any, context: any) => {
            expect(data).to.deep.equal(constructVersion());
          }
        ),
      ]);
    });
  });

  describe('handler namespace', () => {
    describe('#onUpdate', () => {
      it('should have an empty trigger', () => {
        const cloudFunction = functions.handler.remoteConfig.onUpdate(
          () => null
        );
        expect(cloudFunction.__trigger).to.deep.equal({});
      });

      it('should correctly unwrap the event', () => {
        const cloudFunctionUpdate = functions.handler.remoteConfig.onUpdate(
          (version: remoteConfig.TemplateVersion, context: EventContext) =>
            version
        );
        const event: Event = {
          data: constructVersion(),
          context: {
            eventId: '70172329041928',
            timestamp: '2018-04-09T07:56:12.975Z',
            eventType: 'google.firebase.remoteconfig.update',
            resource: {
              service: 'firebaseremoteconfig.googleapis.com',
              name: 'projects/project1',
            },
          },
        };

        return Promise.all([
          cloudFunctionUpdate(event.data, event.context).then(
            (data: any, context: any) => {
              expect(data).to.deep.equal(constructVersion());
            }
          ),
        ]);
      });
    });
  });
});
