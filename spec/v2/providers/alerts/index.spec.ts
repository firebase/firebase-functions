import * as sinon from "sinon";
import * as config from '../../../../src/config';
import * as options from '../../../../src/v2/options';
import * as alerts from '../../../../src/v2/providers/alerts';
import { expect } from 'chai';
import { CloudEvent, CloudFunction } from '../../../../src/v2/core';
// import { FULL_OPTIONS, FULL_TRIGGER } from '../helpers';

const BASIC_OPTS: options.EventHandlerOptions = {
  labels: {
    key: 'value'
  },
  region: 'us-west1'
};

const BASIC_ENDPOINT = {
  platform: 'gcfv2',
  regions: [
    'us-west1'
  ],
  labels: {
    key: 'value',
  },
};

function getMockFunction(): CloudFunction<alerts.FirebaseAlertData<String>> {
  const func = (raw: CloudEvent<unknown>) => 42;
  func.run = (event: CloudEvent<alerts.FirebaseAlertData<String>>) => 42;
  func.__trigger = 'silence the transpiler';
  func.__endpoint = {};
  return func;
}

describe("alerts", () => {
  describe("onAlertPublished", () => {
    it("should create the function without opts", () => {
      const result = alerts.onAlertPublished("my-alert-type", () => 42);

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: "my-alert-type",
          },
          retry: false
        },
      })
    });

    it("should create the function with opts", () => {
      const result = alerts.onAlertPublished(
        {
          ...BASIC_OPTS,
          alertType: "my-alert-type",
          appId: "123456789",
        },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        ...BASIC_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: "my-alert-type",
            appId: "123456789",
          },
          retry: false
        },
      })
    });

    it('should have a .run method', () => {
      const func = alerts.onAlertPublished("my-alert-type", (event) => event);
  
      const res = func.run('input' as any);
  
      expect(res).to.equal('input');
    });
  });

  describe("defineEndpoint", () => {
    let configStub: sinon.SinonStub;

    beforeEach(() => {
      process.env.GCLOUD_PROJECT = 'aProject';
      configStub = sinon.stub(config, 'firebaseConfig');
    });

    afterEach(() => {
      options.setGlobalOptions({});
      delete process.env.GCLOUD_PROJECT;
      configStub.restore();
    });

    it("should define the endpoint without appId and opts", () => {
      const func = getMockFunction();

      alerts.defineEndpoint(func, {}, "new-alert-type");

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: "new-alert-type",
          },
          retry: false
        },
      })
    });

    it("should define the endpoint without appId, with opts", () => {
      const func = getMockFunction();

      alerts.defineEndpoint(func, BASIC_OPTS, "new-alert-type");

      expect(func.__endpoint).to.deep.equal({
        ...BASIC_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: "new-alert-type",
          },
          retry: false
        },
      })
    });

    it("should define the endpoint with appId", () => {
      const func = getMockFunction();

      alerts.defineEndpoint(func, BASIC_OPTS, "new-alert-type", "123456789");

      expect(func.__endpoint).to.deep.equal({
        ...BASIC_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: "new-alert-type",
            appId: "123456789",
          },
          retry: false
        },
      })
    });

    /* TODO(colerogers): add when we merge container contract branch
    it("should define a complex endpoint", () => {
      const func = getMockFunction();

      alerts.defineEndpoint(func, { ...FULL_OPTIONS }, "new-alert-type", "123456789");

      expect(func.__endpoint).to.deep.equal({
        ...FULL_TRIGGER,
        platform: 'gcfv2',
        region: [
          "us-west1"
        ]
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: "new-alert-type",
            appId: "123456789",
          },
          retry: false
        },
      })
    });
    */

    it("should merge global & specific opts", () => {
      options.setGlobalOptions({
        concurrency: 20,
        region: 'europe-west1',
        minInstances: 1,
      });
      const specificOpts = {
        region: 'us-west1',
        minInstances: 3,
      };
      const func = getMockFunction();

      alerts.defineEndpoint(func, specificOpts, "new-alert-type", "123456789");

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        concurrency: 20,
        regions: [
          'us-west1'
        ],
        minInstances: 3,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: "new-alert-type",
            appId: "123456789",
          },
          retry: false
        },
      });
    })
  });

  describe("getOptsAndAlertTypeAndApp", () => {
    it("should parse a string", () => {
      const myAlertType = 'myalerttype';

      const [opts, alertType, appId] = alerts.getOptsAndAlertTypeAndApp(myAlertType);

      expect(opts).to.deep.equal({});
      expect(alertType).to.equal(myAlertType);
      expect(appId).to.be.undefined;
    });
    
    it("should parse an options object without appId", () => {
      const myOpts: alerts.FirebaseAlertOptions = {
        alertType: 'myalerttype',
        region: 'us-west1',
      };

      const [opts, alertType, appId] = alerts.getOptsAndAlertTypeAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(alertType).to.equal(myOpts.alertType);
      expect(appId).to.be.undefined;
    });

    it("should parse an options object with appId", () => {
      const myOpts: alerts.FirebaseAlertOptions = {
        alertType: 'myalerttype',
        appId: '123456789',
        region: 'us-west1',
      };

      const [opts, alertType, appId] = alerts.getOptsAndAlertTypeAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(alertType).to.equal(myOpts.alertType);
      expect(appId).to.be.equal(myOpts.appId);
    });
  })
});