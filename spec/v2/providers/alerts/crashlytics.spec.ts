import { expect } from "chai";
import * as alerts from "../../../../src/v2/providers/alerts";
import * as crashlytics from "../../../../src/v2/providers/alerts/crashlytics";
import { FULL_OPTIONS } from "../fixtures";
import { FULL_ENDPOINT, MINIMAL_V2_ENDPOINT } from "../../../fixtures";
import { onInit } from "../../../../src/v2/core";

const ALERT_TYPE = "new-alert-type";
const APPID = "123456789";
const myHandler = () => 42;

describe("crashlytics", () => {
  const testcases = [
    {
      method: "onNewFatalIssuePublished",
      event: crashlytics.newFatalIssueAlert,
    },
    {
      method: "onNewNonfatalIssuePublished",
      event: crashlytics.newNonfatalIssueAlert,
    },
    {
      method: "onRegressionAlertPublished",
      event: crashlytics.regressionAlert,
    },
    {
      method: "onStabilityDigestPublished",
      event: crashlytics.stabilityDigestAlert,
    },
    {
      method: "onVelocityAlertPublished",
      event: crashlytics.velocityAlert,
    },
    {
      method: "onNewAnrIssuePublished",
      event: crashlytics.newAnrIssueAlert,
    },
  ];

  for (const { method, event } of testcases) {
    const ALERT_EVENT_FILTER = {
      alerttype: event,
    };

    const ALERT_APP_EVENT_FILTER = {
      ...ALERT_EVENT_FILTER,
      appid: APPID,
    };

    describe(method, () => {
      it("should create a function only handler", () => {
        const func = crashlytics[method](myHandler);

        expect(func.__endpoint).to.deep.equal({
          ...MINIMAL_V2_ENDPOINT,
          platform: "gcfv2",
          labels: {},
          eventTrigger: {
            eventType: alerts.eventType,
            eventFilters: ALERT_EVENT_FILTER,
            retry: false,
          },
        });
      });

      it("should create a function with appId", () => {
        const func = crashlytics[method](APPID, myHandler);

        expect(func.__endpoint).to.deep.equal({
          ...MINIMAL_V2_ENDPOINT,
          platform: "gcfv2",
          labels: {},
          eventTrigger: {
            eventType: alerts.eventType,
            eventFilters: ALERT_APP_EVENT_FILTER,
            retry: false,
          },
        });
      });

      it("should create a function with base opts", () => {
        const func = crashlytics[method]({ ...FULL_OPTIONS }, myHandler);

        expect(func.__endpoint).to.deep.equal({
          ...FULL_ENDPOINT,
          platform: "gcfv2",
          eventTrigger: {
            eventType: alerts.eventType,
            eventFilters: ALERT_EVENT_FILTER,
            retry: false,
          },
        });
      });

      it("should create a function with opts", () => {
        const func = crashlytics[method]({ ...FULL_OPTIONS, appId: APPID }, myHandler);

        expect(func.__endpoint).to.deep.equal({
          ...FULL_ENDPOINT,
          platform: "gcfv2",
          eventTrigger: {
            eventType: alerts.eventType,
            eventFilters: ALERT_APP_EVENT_FILTER,
            retry: false,
          },
        });
      });

      it("calls init function", async () => {
        const func = crashlytics[method](APPID, myHandler);

        let hello;
        onInit(() => (hello = "world"));
        expect(hello).to.be.undefined;
        await func({ data: "crash" } as any);
        expect(hello).to.equal("world");
      })
    });
  }

  const ALERT_EVENT_FILTER = {
    alerttype: ALERT_TYPE,
  };

  const ALERT_APP_EVENT_FILTER = {
    ...ALERT_EVENT_FILTER,
    appid: APPID,
  };

  describe("onOperation", () => {
    it("should create a function with alertType only", () => {
      const func = crashlytics.onOperation(ALERT_TYPE, myHandler, undefined);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: ALERT_EVENT_FILTER,
          retry: false,
        },
      });
    });

    it("should create a function with alertType & appId", () => {
      const func = crashlytics.onOperation(ALERT_TYPE, APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: ALERT_APP_EVENT_FILTER,
          retry: false,
        },
      });
    });

    it("should create a function with base opts", () => {
      const func = crashlytics.onOperation(ALERT_TYPE, { ...FULL_OPTIONS }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: ALERT_EVENT_FILTER,
          retry: false,
        },
      });
    });

    it("should create a function with appid in opts", () => {
      const func = crashlytics.onOperation(
        ALERT_TYPE,
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: ALERT_APP_EVENT_FILTER,
          retry: false,
        },
      });
    });

    it("should create a function with a run method", () => {
      const func = crashlytics.onOperation(ALERT_TYPE, (event) => event, undefined);

      const res = func.run("input" as any);

      expect(res).to.equal("input");
    });
  });

  describe("getOptsAndApp", () => {
    it("should parse a string", () => {
      const APPID = "123456789";

      const [opts, appId] = crashlytics.getOptsAndApp(APPID);

      expect(opts).to.deep.equal({});
      expect(appId).to.equal(APPID);
    });

    it("should parse an options object without appId", () => {
      const myOpts: crashlytics.CrashlyticsOptions = {
        region: "us-west1",
      };

      const [opts, appId] = crashlytics.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: "us-west1" });
      expect(appId).to.be.undefined;
    });

    it("should parse an options object with appId", () => {
      const myOpts: crashlytics.CrashlyticsOptions = {
        appId: "123456789",
        region: "us-west1",
      };

      const [opts, appId] = crashlytics.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: "us-west1" });
      expect(appId).to.equal(myOpts.appId);
    });
  });
});
