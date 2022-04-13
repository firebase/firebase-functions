import { expect } from 'chai';
import * as alerts from '../../../../src/v2/providers/alerts';
import * as appDistribution from '../../../../src/v2/providers/alerts/appDistribution';
import { FULL_ENDPOINT, FULL_OPTIONS } from '../fixtures';

const APPID = '123456789';
const myHandler = () => 42;

const APP_EVENT_FILTER = {
  appid: APPID,
};

describe('appDistribution', () => {
  describe('onNewTesterIosDevicePublished', () => {
    it('should create a function with alertType & appId', () => {
      const func = appDistribution.onNewTesterIosDevicePublished(
        APPID,
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            ...APP_EVENT_FILTER,
            alerttype: appDistribution.newTesterIosDeviceAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with opts', () => {
      const func = appDistribution.onNewTesterIosDevicePublished(
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: appDistribution.newTesterIosDeviceAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with appid in opts', () => {
      const func = appDistribution.onNewTesterIosDevicePublished(
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            ...APP_EVENT_FILTER,
            alerttype: appDistribution.newTesterIosDeviceAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function without opts or appId', () => {
      const func = appDistribution.onNewTesterIosDevicePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: appDistribution.newTesterIosDeviceAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with a run method', () => {
      const func = appDistribution.onNewTesterIosDevicePublished(
        APPID,
        (event) => event
      );

      const res = func.run('input' as any);

      expect(res).to.equal('input');
    });
  });

  describe('getOptsAndApp', () => {
    it('should parse a string', () => {
      const [opts, appId] = appDistribution.getOptsAndApp(APPID);

      expect(opts).to.deep.equal({});
      expect(appId).to.equal(APPID);
    });

    it('should parse an options object without appId', () => {
      const myOpts: appDistribution.AppDistributionOptions = {
        region: 'us-west1',
      };

      const [opts, appId] = appDistribution.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(appId).to.be.undefined;
    });

    it('should parse an options object with appId', () => {
      const myOpts: appDistribution.AppDistributionOptions = {
        appId: APPID,
        region: 'us-west1',
      };

      const [opts, appId] = appDistribution.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(appId).to.equal(APPID);
    });
  });
});
