import { expect } from 'chai';
import { CloudEvent, CloudFunction } from '../../../../src/v2/core';
import * as options from '../../../../src/v2/options';
import * as alerts from '../../../../src/v2/providers/alerts';
import { FULL_ENDPOINT, FULL_OPTIONS } from '../helpers';

const ALERT_TYPE = 'new-alert-type';
const APPID = '123456789';

function getMockFunction(): CloudFunction<alerts.FirebaseAlertData<String>> {
  const func = (raw: CloudEvent<unknown>) => 42;
  func.run = (event: CloudEvent<alerts.FirebaseAlertData<String>>) => 42;
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
          ...FULL_OPTIONS,
          alertType: ALERT_TYPE,
          appId: APPID,
        },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
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

  describe('getEndpointAnnotation', () => {
    beforeEach(() => {
      process.env.GCLOUD_PROJECT = 'aProject';
    });

    afterEach(() => {
      options.setGlobalOptions({});
      delete process.env.GCLOUD_PROJECT;
    });

    it('should define the endpoint without appId and opts', () => {
      const func = getMockFunction();

      func.__endpoint = alerts.getEndpointAnnotation({}, ALERT_TYPE);

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

    it('should define a complex endpoint without appId', () => {
      const func = getMockFunction();

      func.__endpoint = alerts.getEndpointAnnotation(
        { ...FULL_OPTIONS },
        ALERT_TYPE
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: ALERT_TYPE,
          },
          retry: false,
        },
      });
    });

    it('should define a complex endpoint', () => {
      const func = getMockFunction();

      func.__endpoint = alerts.getEndpointAnnotation(
        { ...FULL_OPTIONS },
        ALERT_TYPE,
        APPID
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
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

      func.__endpoint = alerts.getEndpointAnnotation(
        specificOpts,
        ALERT_TYPE,
        APPID
      );

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
