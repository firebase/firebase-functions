import * as sinon from 'sinon';
import * as config from '../../../../src/config';
import * as options from '../../../../src/v2/options';
import * as alerts from '../../../../src/v2/providers/alerts';
import { expect } from 'chai';
import { CloudEvent, CloudFunction } from '../../../../src/v2/core';
import { BASIC_OPTIONS, BASIC_ENDPOINT, FULL_OPTIONS, FULL_ENDPOINT } from '../helpers';

const ALERT_TYPE = 'new-alert-type';
const APPID = '123456789';

function getMockFunction(): CloudFunction<alerts.FirebaseAlertData<String>> {
  const func = (raw: CloudEvent<unknown>) => 42;
  func.run = (event: CloudEvent<alerts.FirebaseAlertData<String>>) => 42;
  func.__trigger = 'silence the transpiler';
  func.__endpoint = {};
  return func;
}

describe('alerts', () => {
  describe('onAlertPublished', () => {
    it('should create the function without opts', () => {
      const result = alerts.onAlertPublished(ALERT_TYPE, () => 42);

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: ALERT_TYPE,
          },
          retry: false,
        },
      });
    });

    it('should create the function with opts', () => {
      const result = alerts.onAlertPublished(
        {
          ...BASIC_OPTIONS,
          alertType: ALERT_TYPE,
          appId: APPID,
        },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        ...BASIC_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: ALERT_TYPE,
            appId: APPID,
          },
          retry: false,
        },
      });
    });

    it('should have a .run method', () => {
      const func = alerts.onAlertPublished(ALERT_TYPE, (event) => event);

      const res = func.run('input' as any);

      expect(res).to.equal('input');
    });
  });

  describe('defineEndpoint', () => {
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

    it('should define the endpoint without appId and opts', () => {
      const func = getMockFunction();

      alerts.defineEndpoint(func, {}, ALERT_TYPE);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: ALERT_TYPE,
          },
          retry: false,
        },
      });
    });

    it('should define the endpoint without appId, with opts', () => {
      const func = getMockFunction();

      alerts.defineEndpoint(func, { ...BASIC_OPTIONS }, ALERT_TYPE);

      expect(func.__endpoint).to.deep.equal({
        ...BASIC_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: ALERT_TYPE,
          },
          retry: false,
        },
      });
    });

    it('should define the endpoint with appId', () => {
      const func = getMockFunction();

      alerts.defineEndpoint(func, { ...BASIC_OPTIONS }, ALERT_TYPE, APPID);

      expect(func.__endpoint).to.deep.equal({
        ...BASIC_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: ALERT_TYPE,
            appId: APPID,
          },
          retry: false,
        },
      });
    });

    it("should define a complex endpoint", () => {
      const func = getMockFunction();

      alerts.defineEndpoint(func, { ...FULL_OPTIONS }, "new-alert-type", "123456789");

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
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

    it('should merge global & specific opts', () => {
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

      alerts.defineEndpoint(func, specificOpts, ALERT_TYPE, APPID);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        concurrency: 20,
        region: ['us-west1'],
        minInstances: 3,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: ALERT_TYPE,
            appId: APPID,
          },
          retry: false,
        },
      });
    });
  });

  describe('getOptsAndAlertTypeAndApp', () => {
    it('should parse a string', () => {
      const [opts, alertType, appId] = alerts.getOptsAndAlertTypeAndApp(
        ALERT_TYPE
      );

      expect(opts).to.deep.equal({});
      expect(alertType).to.equal(ALERT_TYPE);
      expect(appId).to.be.undefined;
    });

    it('should parse an options object without appId', () => {
      const myOpts: alerts.FirebaseAlertOptions = {
        alertType: ALERT_TYPE,
        region: 'us-west1',
      };

      const [opts, alertType, appId] = alerts.getOptsAndAlertTypeAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(alertType).to.equal(myOpts.alertType);
      expect(appId).to.be.undefined;
    });

    it('should parse an options object with appId', () => {
      const myOpts: alerts.FirebaseAlertOptions = {
        alertType: ALERT_TYPE,
        appId: APPID,
        region: 'us-west1',
      };

      const [opts, alertType, appId] = alerts.getOptsAndAlertTypeAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(alertType).to.equal(myOpts.alertType);
      expect(appId).to.be.equal(myOpts.appId);
    });
  });
});
