import * as alerts from "../../../../src/v2/providers/alerts";
import * as billing from '../../../../src/v2/providers/alerts/billing';
import { expect } from 'chai';


const myAlertType = "my-alert-type";
const myHandler = () => 42;

describe("billing", () => {
  describe("onPlanUpdatePublished", () => {
    it("should create a function with only handler", () => {
      const func = billing.onPlanUpdatePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: billing.planUpdateAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with opts & handler", () => {
      const func = billing.onPlanUpdatePublished({ region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: billing.planUpdateAlert,
          },
          retry: false
        },
      });
    });
  });

  describe("onAutomatedPlanUpdatePublished", () => {
    it("should create a function with only handler", () => {
      const func = billing.onAutomatedPlanUpdatePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: billing.automatedPlanUpdateAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with opts & handler", () => {
      const func = billing.onAutomatedPlanUpdatePublished({ region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: billing.automatedPlanUpdateAlert,
          },
          retry: false
        },
      });
    });
  });

  describe("onOperation", () => {
    it("should create a function with alertType only", () => {
      const func = billing.onOperation(myAlertType, myHandler, undefined);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: myAlertType,
          },
          retry: false
        },
      });
    });

    it("should create a function with opts", () => {
      const func = billing.onOperation(myAlertType, { region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: myAlertType,
          },
          retry: false
        },
      });
    });

    it("should create a function with a run method", () => {
      const func = billing.onOperation(myAlertType, (event) => event, undefined);

      const res = func.run('input' as any);
  
      expect(res).to.equal('input');
    });
  });
});