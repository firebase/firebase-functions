import * as alerts from '../../../../src/v2/providers/alerts';
import * as billing from '../../../../src/v2/providers/alerts/billing';
import { expect } from 'chai';
import { BASIC_OPTIONS, BASIC_ENDPOINT } from '../helpers';

const ALERT_TYPE = 'new-alert-type';
const myHandler = () => 42;

describe('billing', () => {
  describe('onPlanUpdatePublished', () => {
    it('should create a function with only handler', () => {
      const func = billing.onPlanUpdatePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: billing.planUpdateAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with opts & handler', () => {
      const func = billing.onPlanUpdatePublished(
        { ...BASIC_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...BASIC_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: billing.planUpdateAlert,
          },
          retry: false,
        },
      });
    });
  });

  describe('onAutomatedPlanUpdatePublished', () => {
    it('should create a function with only handler', () => {
      const func = billing.onAutomatedPlanUpdatePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: billing.automatedPlanUpdateAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with opts & handler', () => {
      const func = billing.onAutomatedPlanUpdatePublished(
        { ...BASIC_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...BASIC_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: billing.automatedPlanUpdateAlert,
          },
          retry: false,
        },
      });
    });
  });

  describe('onOperation', () => {
    it('should create a function with alertType only', () => {
      const func = billing.onOperation(ALERT_TYPE, myHandler, undefined);

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

    it('should create a function with opts', () => {
      const func = billing.onOperation(
        ALERT_TYPE,
        { ...BASIC_OPTIONS },
        myHandler
      );

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

    it('should create a function with a run method', () => {
      const func = billing.onOperation(
        ALERT_TYPE,
        (event) => event,
        undefined
      );

      const res = func.run('input' as any);

      expect(res).to.equal('input');
    });
  });
});
