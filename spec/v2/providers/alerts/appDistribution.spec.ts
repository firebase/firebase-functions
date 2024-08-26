import { expect } from "chai";
import * as alerts from "../../../../src/v2/providers/alerts";
import * as appDistribution from "../../../../src/v2/providers/alerts/appDistribution";
import { FULL_OPTIONS } from "../fixtures";
import { FULL_ENDPOINT, MINIMAL_V2_ENDPOINT } from "../../../fixtures";
import { onInit } from "../../../../src/v2/core";

const APPID = "123456789";
const myHandler = () => 42;

const APP_EVENT_FILTER = {
  appid: APPID,
};

describe("appDistribution", () => {
  describe("onNewTesterIosDevicePublished", () => {
    it("should create a function with alertType & appId", () => {
      const func = appDistribution.onNewTesterIosDevicePublished(APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
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

    it("should create a function with opts", () => {
      const func = appDistribution.onNewTesterIosDevicePublished({ ...FULL_OPTIONS }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: appDistribution.newTesterIosDeviceAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function with appid in opts", () => {
      const func = appDistribution.onNewTesterIosDevicePublished(
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
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

    it("should create a function without opts or appId", () => {
      const func = appDistribution.onNewTesterIosDevicePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
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

    it("should create a function with a run method", () => {
      const func = appDistribution.onNewTesterIosDevicePublished(APPID, (event) => event);

      const res = func.run("input" as any);

      expect(res).to.equal("input");
    });

    it("calls init function", async () => {
      const func = appDistribution.onNewTesterIosDevicePublished(APPID, (event) => event);

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await func({ data: "test" } as any);
      expect(hello).to.equal("world");
    });
  });

  describe("onInAppfeedbackPublished", () => {
    it("should create a function with alertType & appId", () => {
      const func = appDistribution.onInAppFeedbackPublished(APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            ...APP_EVENT_FILTER,
            alerttype: appDistribution.inAppFeedbackAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function with opts", () => {
      const func = appDistribution.onInAppFeedbackPublished({ ...FULL_OPTIONS }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: appDistribution.inAppFeedbackAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function with appid in opts", () => {
      const func = appDistribution.onInAppFeedbackPublished(
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            ...APP_EVENT_FILTER,
            alerttype: appDistribution.inAppFeedbackAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function without opts or appId", () => {
      const func = appDistribution.onInAppFeedbackPublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: appDistribution.inAppFeedbackAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function with a run method", () => {
      const func = appDistribution.onInAppFeedbackPublished(APPID, (event) => event);

      const res = func.run("input" as any);

      expect(res).to.equal("input");
    });

    it("calls init function", async () => {
      const func = appDistribution.onInAppFeedbackPublished(APPID, (event) => event);

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await func({ data: "test" } as any);
      expect(hello).to.equal("world");
    });
  });

  describe("getOptsAndApp", () => {
    it("should parse a string", () => {
      const [opts, appId] = appDistribution.getOptsAndApp(APPID);

      expect(opts).to.deep.equal({});
      expect(appId).to.equal(APPID);
    });

    it("should parse an options object without appId", () => {
      const myOpts: appDistribution.AppDistributionOptions = {
        region: "us-west1",
      };

      const [opts, appId] = appDistribution.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: "us-west1" });
      expect(appId).to.be.undefined;
    });

    it("should parse an options object with appId", () => {
      const myOpts: appDistribution.AppDistributionOptions = {
        appId: APPID,
        region: "us-west1",
      };

      const [opts, appId] = appDistribution.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: "us-west1" });
      expect(appId).to.equal(APPID);
    });
  });
});
