import { expect } from 'chai';
import * as alerts from '../../../../src/v2/providers/alerts';
import * as crashlytics from '../../../../src/v2/providers/alerts/crashlytics';
import { FULL_ENDPOINT, FULL_OPTIONS } from '../helpers';

const ALERT_TYPE = 'new-alert-type';
const APPID = '123456789';
const myHandler = () => 42;

describe('crashlytics', () => {
  describe('onNewFatalIssuePublished', () => {
    it('should create a function only handler', () => {
      const func = crashlytics.onNewFatalIssuePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newFatalIssueAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with appId', () => {
      const func = crashlytics.onNewFatalIssuePublished(APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newFatalIssueAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });

    it('should create a function with base opts', () => {
      const func = crashlytics.onNewFatalIssuePublished(
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newFatalIssueAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with opts', () => {
      const func = crashlytics.onNewFatalIssuePublished(
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newFatalIssueAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });
  });

  describe('onNewNonfatalIssuePublished', () => {
    it('should create a function only handler', () => {
      const func = crashlytics.onNewNonfatalIssuePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newNonfatalIssueAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with appId', () => {
      const func = crashlytics.onNewNonfatalIssuePublished(APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newNonfatalIssueAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });

    it('should create a function with base opts', () => {
      const func = crashlytics.onNewNonfatalIssuePublished(
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newNonfatalIssueAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with opts', () => {
      const func = crashlytics.onNewNonfatalIssuePublished(
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newNonfatalIssueAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });
  });

  describe('onRegressionAlertPublished', () => {
    it('should create a function only handler', () => {
      const func = crashlytics.onRegressionAlertPublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.regressionAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with appId', () => {
      const func = crashlytics.onRegressionAlertPublished(APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.regressionAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });

    it('should create a function with base opts', () => {
      const func = crashlytics.onRegressionAlertPublished(
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.regressionAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with opts', () => {
      const func = crashlytics.onRegressionAlertPublished(
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.regressionAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });
  });

  describe('onStabilityDigestPublished', () => {
    it('should create a function only handler', () => {
      const func = crashlytics.onStabilityDigestPublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.stabilityDigestAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with appId', () => {
      const func = crashlytics.onStabilityDigestPublished(APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.stabilityDigestAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });

    it('should create a function with base opts', () => {
      const func = crashlytics.onStabilityDigestPublished(
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.stabilityDigestAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with opts', () => {
      const func = crashlytics.onStabilityDigestPublished(
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.stabilityDigestAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });
  });

  describe('onVelocityAlertPublished', () => {
    it('should create a function only handler', () => {
      const func = crashlytics.onVelocityAlertPublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.velocityAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with appId', () => {
      const func = crashlytics.onVelocityAlertPublished(APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.velocityAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });

    it('should create a function with base opts', () => {
      const func = crashlytics.onVelocityAlertPublished(
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.velocityAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with opts', () => {
      const func = crashlytics.onVelocityAlertPublished(
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.velocityAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });
  });

  describe('onNewAnrIssuePublished', () => {
    it('should create a function only handler', () => {
      const func = crashlytics.onNewAnrIssuePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newAnrIssueAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with appId', () => {
      const func = crashlytics.onNewAnrIssuePublished(APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newAnrIssueAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });

    it('should create a function with base opts', () => {
      const func = crashlytics.onNewAnrIssuePublished(
        { ...FULL_OPTIONS },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newAnrIssueAlert,
          },
          retry: false,
        },
      });
    });

    it('should create a function with opts', () => {
      const func = crashlytics.onNewAnrIssuePublished(
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
      );

      expect(func.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newAnrIssueAlert,
            appId: APPID,
          },
          retry: false,
        },
      });
    });
  });

  describe('onOperation', () => {
    it('should create a function with alertType only', () => {
      const func = crashlytics.onOperation(ALERT_TYPE, myHandler, undefined);

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

    it('should create a function with alertType & appId', () => {
      const func = crashlytics.onOperation(ALERT_TYPE, APPID, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
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

    it('should create a function with base opts', () => {
      const func = crashlytics.onOperation(
        ALERT_TYPE,
        { ...FULL_OPTIONS },
        myHandler
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

    it('should create a function with appid in opts', () => {
      const func = crashlytics.onOperation(
        ALERT_TYPE,
        { ...FULL_OPTIONS, appId: APPID },
        myHandler
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

    it('should create a function with a run method', () => {
      const func = crashlytics.onOperation(
        ALERT_TYPE,
        (event) => event,
        undefined
      );

      const res = func.run('input' as any);

      expect(res).to.equal('input');
    });
  });

  describe('getOptsAndApp', () => {
    it('should parse a string', () => {
      const APPID = '123456789';

      const [opts, appId] = crashlytics.getOptsAndApp(APPID);

      expect(opts).to.deep.equal({});
      expect(appId).to.equal(APPID);
    });

    it('should parse an options object without appId', () => {
      const myOpts: crashlytics.CrashlyticsOptions = {
        region: 'us-west1',
      };

      const [opts, appId] = crashlytics.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(appId).to.be.undefined;
    });

    it('should parse an options object with appId', () => {
      const myOpts: crashlytics.CrashlyticsOptions = {
        appId: '123456789',
        region: 'us-west1',
      };

      const [opts, appId] = crashlytics.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(appId).to.equal(myOpts.appId);
    });
  });
});
