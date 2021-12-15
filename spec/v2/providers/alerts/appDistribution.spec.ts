import * as alerts from "../../../../src/v2/providers/alerts";
import * as appDistribution from '../../../../src/v2/providers/alerts/appDistribution';
import { expect } from 'chai';

const myAppId = "123456789";
const myHandler = () => 42;

describe("appDistribution", () => {
  describe("onNewTesterIosDevicePublished", () => {
    it("should create a function with alertType & appId", () => {
      const func = appDistribution.onNewTesterIosDevicePublished(myAppId, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: appDistribution.newTesterIosDeviceAlert,
            appId: myAppId,
          },
          retry: false
        },
      });
    });

    it("should create a function with base opts", () => {
      const func = appDistribution.onNewTesterIosDevicePublished({ region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: appDistribution.newTesterIosDeviceAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with appid in opts", () => {
      const func = appDistribution.onNewTesterIosDevicePublished({ region: 'us-west1', appId: myAppId }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: appDistribution.newTesterIosDeviceAlert,
            appId: myAppId,
          },
          retry: false
        },
      });
    });

    it("should create a function without opts or appId", () => {
      const func = appDistribution.onNewTesterIosDevicePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: appDistribution.newTesterIosDeviceAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with a run method", () => {
      const func = appDistribution.onNewTesterIosDevicePublished(myAppId, (event) => event);

      const res = func.run('input' as any);
  
      expect(res).to.equal('input');
    });
  });

  describe("getOptsAndApp", () => {
    it("should parse a string", () => {
      const [opts, appId] = appDistribution.getOptsAndApp(myAppId);

      expect(opts).to.deep.equal({});
      expect(appId).to.equal(myAppId);
    });
    
    it("should parse an options object without appId", () => {
      const myOpts: appDistribution.AppDistributionOptions = {
        region: 'us-west1',
      };

      const [opts, appId] = appDistribution.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(appId).to.be.undefined;
    });

    it("should parse an options object with appId", () => {
      const myOpts: appDistribution.AppDistributionOptions = {
        appId: myAppId,
        region: 'us-west1',
      };

      const [opts, appId] = appDistribution.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(appId).to.equal(myAppId);
    });
  });
});