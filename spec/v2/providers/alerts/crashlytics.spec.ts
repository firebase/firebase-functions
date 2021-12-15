import { expect } from 'chai';
// import { CloudEvent } from '../../../../src/v2/core';
// import * as options from '../../../../src/v2/options';
import * as alerts from "../../../../src/v2/providers/alerts";
import * as crashlytics from '../../../../src/v2/providers/alerts/crashlytics';

const myAlertType = "my-alert-type";
const myAppId = "123456789";
const myHandler = () => 42;

describe("crashlytics", () => {
  describe("onNewFatalIssuePublished", () => {
    it("should create a function only handler", () => {
      const func = crashlytics.onNewFatalIssuePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newFatalIssueAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with appId", () => {
      const func = crashlytics.onNewFatalIssuePublished(myAppId, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newFatalIssueAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });

    it("should create a function with base opts", () => {
      const func = crashlytics.onNewFatalIssuePublished({ region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newFatalIssueAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with opts", () => {
      const func = crashlytics.onNewFatalIssuePublished({ region: 'us-west1', appId: myAppId }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newFatalIssueAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });
  });

  describe("onNewNonfatalIssuePublished", () => {
    it("should create a function only handler", () => {
      const func = crashlytics.onNewNonfatalIssuePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newNonfatalIssueAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with appId", () => {
      const func = crashlytics.onNewNonfatalIssuePublished(myAppId, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newNonfatalIssueAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });

    it("should create a function with base opts", () => {
      const func = crashlytics.onNewNonfatalIssuePublished({ region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newNonfatalIssueAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with opts", () => {
      const func = crashlytics.onNewNonfatalIssuePublished({ region: 'us-west1', appId: myAppId }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newNonfatalIssueAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });
  });

  describe("onRegressionAlertPublished", () => {
    it("should create a function only handler", () => {
      const func = crashlytics.onRegressionAlertPublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.regressionAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with appId", () => {
      const func = crashlytics.onRegressionAlertPublished(myAppId, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.regressionAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });

    it("should create a function with base opts", () => {
      const func = crashlytics.onRegressionAlertPublished({ region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.regressionAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with opts", () => {
      const func = crashlytics.onRegressionAlertPublished({ region: 'us-west1', appId: myAppId }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.regressionAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });
  });

  describe("onStabilityDigestPublished", () => {
    it("should create a function only handler", () => {
      const func = crashlytics.onStabilityDigestPublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.stabilityDigestAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with appId", () => {
      const func = crashlytics.onStabilityDigestPublished(myAppId, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.stabilityDigestAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });

    it("should create a function with base opts", () => {
      const func = crashlytics.onStabilityDigestPublished({ region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.stabilityDigestAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with opts", () => {
      const func = crashlytics.onStabilityDigestPublished({ region: 'us-west1', appId: myAppId }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.stabilityDigestAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });
  });

  describe("onVelocityAlertPublished", () => {
    it("should create a function only handler", () => {
      const func = crashlytics.onVelocityAlertPublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.velocityAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with appId", () => {
      const func = crashlytics.onVelocityAlertPublished(myAppId, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.velocityAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });

    it("should create a function with base opts", () => {
      const func = crashlytics.onVelocityAlertPublished({ region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.velocityAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with opts", () => {
      const func = crashlytics.onVelocityAlertPublished({ region: 'us-west1', appId: myAppId }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.velocityAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });
  });

  describe("onNewAnrIssuePublished", () => {
    it("should create a function only handler", () => {
      const func = crashlytics.onNewAnrIssuePublished(myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newAnrIssueAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with appId", () => {
      const func = crashlytics.onNewAnrIssuePublished(myAppId, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newAnrIssueAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });

    it("should create a function with base opts", () => {
      const func = crashlytics.onNewAnrIssuePublished({ region: 'us-west1' }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newAnrIssueAlert,
          },
          retry: false
        },
      });
    });

    it("should create a function with opts", () => {
      const func = crashlytics.onNewAnrIssuePublished({ region: 'us-west1', appId: myAppId }, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        regions: [
          'us-west1'
        ],
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: crashlytics.newAnrIssueAlert,
            appId: myAppId
          },
          retry: false
        },
      });
    });
  });

  describe("onOperation", () => {
    it("should create a function with alertType only", () => {
      const func = crashlytics.onOperation(myAlertType, myHandler, undefined);

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

    it("should create a function with alertType & appId", () => {
      const func = crashlytics.onOperation(myAlertType, myAppId, myHandler);

      expect(func.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: alerts.eventType,
          eventFilters: {
            alertType: myAlertType,
            appId: myAppId,
          },
          retry: false
        },
      });
    });

    it("should create a function with base opts", () => {
      const func = crashlytics.onOperation(myAlertType, { region: 'us-west1' }, myHandler);

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

    it("should create a function with appid in opts", () => {
      const func = crashlytics.onOperation(myAlertType, { region: 'us-west1', appId: myAppId }, myHandler);

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
            appId: myAppId,
          },
          retry: false
        },
      });
    });

    it("should create a function with a run method", () => {
      const func = crashlytics.onOperation(myAlertType, (event) => event, undefined);

      const res = func.run('input' as any);
  
      expect(res).to.equal('input');
    });
  });

  describe("getOptsAndApp", () => {
    it("should parse a string", () => {
      const myAppId = '123456789';

      const [opts, appId] = crashlytics.getOptsAndApp(myAppId);

      expect(opts).to.deep.equal({});
      expect(appId).to.equal(myAppId);
    });
    
    it("should parse an options object without appId", () => {
      const myOpts: crashlytics.CrashlyticsOptions = {
        region: 'us-west1',
      };

      const [opts, appId] = crashlytics.getOptsAndApp(myOpts);

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(appId).to.be.undefined;
    });

    it("should parse an options object with appId", () => {
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