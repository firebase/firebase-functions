import { expect } from "chai";
import { onInit } from "../../../../src/v2/core";
import * as alerts from "../../../../src/v2/providers/alerts";
import * as billing from "../../../../src/v2/providers/alerts/billing";
import { FULL_ENDPOINT, MINIMAL_V2_ENDPOINT } from "../../../fixtures";
import { FULL_OPTIONS } from "../fixtures";

const ALERT_TYPE = "new-alert-type";
const myHandler = () => 42;

describe("billing", () => {
  describe("onPlanUpdatePublished", () => {
    it("should create a function with only handler", () => {
      const func = billing.onPlanUpdatePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: billing.planUpdateAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function with opts & handler", () => {
      const func = billing.onPlanUpdatePublished({ ...FULL_OPTIONS }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: billing.planUpdateAlert,
          },
          retry: false,
        },
      });
    });

    it("calls init function", async () => {
      const func = billing.onPlanAutomatedUpdatePublished((event) => event);

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await func({ data: "test" } as any);
      expect(hello).to.equal("world");
    });
  });

  describe("onPlanAutomatedUpdatePublished", () => {
    it("should create a function with only handler", () => {
      const func = billing.onPlanAutomatedUpdatePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: billing.planAutomatedUpdateAlert,
          },
          retry: false,
        },
      });
    });

    it("should create a function with opts & handler", () => {
      const func = billing.onPlanAutomatedUpdatePublished({ ...FULL_OPTIONS }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: billing.planAutomatedUpdateAlert,
          },
          retry: false,
        },
      });
    });

    it("calls init function", async () => {
      const func = billing.onPlanAutomatedUpdatePublished((event) => event);

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await func({ data: "test" } as any);
      expect(hello).to.equal("world");
    });
  });

  describe("onOperation", () => {
    it("should create a function with alertType only", () => {
      const func = billing.onOperation(ALERT_TYPE, myHandler, undefined);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: ALERT_TYPE,
          },
          retry: false,
        },
      });
    });

    it("should create a function with opts", () => {
      const func = billing.onOperation(ALERT_TYPE, { ...FULL_OPTIONS }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alerttype: ALERT_TYPE,
          },
          retry: false,
        },
      });
    });

    it("should create a function with a run method", () => {
      const func = billing.onOperation(ALERT_TYPE, (event) => event, undefined);

      const res = func.run("input" as any);

      expect(res).to.equal("input");
    });

    it("calls init function", async () => {
      const func = billing.onOperation(ALERT_TYPE, (event) => event, undefined);

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await func({ data: "test" } as any);
      expect(hello).to.equal("world");
    });
  });
});
