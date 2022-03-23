import { expect } from 'chai';
import * as alerts from '../../../../src/v2/providers/alerts';
import * as billing from '../../../../src/v2/providers/alerts/billing';
import { FULL_ENDPOINT, FULL_OPTIONS } from '../fixtures';

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
          eventFilters: [
            {
              attribute: 'alerttype',
              value: billing.planUpdateAlert,
            },
          ],
          retry: false,
        },
      });
    });

    it('should create a function with opts & handler', () => {
      const func = billing.onPlanUpdatePublished(
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: [
            {
              attribute: 'alerttype',
              value: billing.planUpdateAlert,
            },
          ],
          retry: false,
        },
      });
    });
  });

  describe('onPlanAutomatedUpdatePublished', () => {
    it('should create a function with only handler', () => {
      const func = billing.onPlanAutomatedUpdatePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: [
            {
              attribute: 'alerttype',
              value: billing.planAutomatedUpdateAlert,
            },
          ],
          retry: false,
        },
      });
    });

    it('should create a function with opts & handler', () => {
      const func = billing.onPlanAutomatedUpdatePublished(
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: [
            {
              attribute: 'alerttype',
              value: billing.planAutomatedUpdateAlert,
            },
          ],
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
          eventFilters: [
            {
              attribute: 'alerttype',
              value: ALERT_TYPE,
            },
          ],
          retry: false,
        },
      });
    });

    it('should create a function with opts', () => {
      const func = billing.onOperation(
        ALERT_TYPE,
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: [
            {
              attribute: 'alerttype',
              value: ALERT_TYPE,
            },
          ],
          retry: false,
        },
      });
    });

    it('should create a function with a run method', () => {
      const func = billing.onOperation(ALERT_TYPE, (event) => event, undefined);

      const res = func.run('input' as any);

      expect(res).to.equal('input');
    });
  });
});
