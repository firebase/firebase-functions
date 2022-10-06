import { expect } from "chai";
import * as alerts from "../../../../src/v2/providers/alerts";
import * as performance from "../../../../src/v2/providers/alerts/performance";
import { FULL_OPTIONS } from "../fixtures";
import { FULL_ENDPOINT, MINIMAL_V2_ENDPOINT } from "../../../fixtures";

const APPID = "123456789";
const myHandler = () => 42;

const APP_EVENT_FILTER = {
  appid: APPID,
};

describe("performance", () => {
  describe("onThresholdAlertPublished", () => {
    it("should create a function with alertType & appId", () => {
      const func = performance.onThresholdAlertPublished(APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            ...APP_EVENT_FILTER,
            alerttype: performance.thresholdAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function with opts", () => {
      const func = performance.onThresholdAlertPublished({ ...FULL_OPTIONS }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: performance.thresholdAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function with appid in opts", () => {
      const func = performance.onThresholdAlertPublished(
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
            alerttype: performance.thresholdAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function without opts or appId", () => {
      const func = performance.onThresholdAlertPublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: performance.thresholdAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function with a run method", () => {
      const func = performance.onThresholdAlertPublished(APPID, (event) => event);

      const res = func.run("input" as any);

      expect(res).to.equal("input");
    });
  });

  describe("getOptsAndApp", () => {
    it("should parse a string", () => {
      const [opts, appId] = performance.getOptsAndApp(APPID);

      expect(opts).to.deep.equal({});
      expect(appId).to.equal(APPID);
    });

    it("should parse an options object without appId", () => {
      const myOpts: performance.PerformanceOptions = {
        region: "us-west1",
      };

      const [opts, appId] = performance.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: "us-west1" });
      expect(appId).to.be.undefined;
    });

    it("should parse an options object with appId", () => {
      const myOpts: performance.PerformanceOptions = {
        appId: APPID,
        region: "us-west1",
      };

      const [opts, appId] = performance.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: "us-west1" });
      expect(appId).to.equal(APPID);
    });
  });

  describe("convertPayload", () => {
    it("should return the same payload", () => {
      const payload = {
        a: "b",
        conditionPercentile: 23,
        appVersion: "3",
      };

      const convertedPayload = performance.convertPayload(payload as any);

      expect(convertedPayload).to.deep.eq(payload);
    });

    it("should return the same payload if the fields are undefined", () => {
      const payload = {
        a: "b",
      };

      const convertedPayload = performance.convertPayload(payload as any);

      expect(convertedPayload).to.deep.eq({
        a: "b",
      });
    });

    it("should remove fields", () => {
      const payload = {
        a: "b",
        conditionPercentile: 0,
        appVersion: "",
      };

      const convertedPayload = performance.convertPayload(payload as any);

      expect(convertedPayload).to.deep.eq({
        a: "b",
      });
    });
  });
});
