import {
  onAlertPublished,
  crashlytics,
  billing,
  appDistribution,
  performance,
} from "firebase-functions/v2/alerts";
import { expectEq, TestSuite } from "../testing";

export const alertstestsCrashlytics = onAlertPublished(
  { alertType: "crashlytics.newFatalIssue" },
  (event) => {
    const testId = event.appId || "unknown";

    return new TestSuite("alerts crashlytics onAlertPublished")
      .it("should have alert type", () => {
        expectEq(event.alertType, "crashlytics.newFatalIssue");
      })
      .it("should have app id", () => {
        expectEq(typeof event.appId, "string");
      })
      .run(testId, event);
  }
);

export const alertstestsBilling = onAlertPublished({ alertType: "billing.planUpdate" }, (event) => {
  const testId = event.appId || "unknown";

  return new TestSuite("alerts billing onAlertPublished")
    .it("should have alert type", () => {
      expectEq(event.alertType, "billing.planUpdate");
    })
    .run(testId, event);
});

export const alertstestsAppDistribution = appDistribution.onNewTesterIosDevicePublished((event) => {
  const testId = event.appId || "unknown";

  return new TestSuite("alerts appDistribution onNewTesterIosDevicePublished")
    .it("should have app id", () => {
      expectEq(typeof event.appId, "string");
    })
    .it("should have tester name", () => {
      expectEq(typeof event.data.testerName, "string");
    })
    .it("should have device model", () => {
      expectEq(typeof event.data.testerDeviceModelName, "string");
    })
    .it("should have device identifier", () => {
      expectEq(typeof event.data.testerDeviceIdentifier, "string");
    })
    .run(testId, event);
});

export const alertstestsPerformance = performance.onThresholdAlertPublished((event) => {
  const testId = event.appId || "unknown";

  return new TestSuite("alerts performance onThresholdAlertPublished")
    .it("should have app id", () => {
      expectEq(typeof event.appId, "string");
    })
    .it("should have metric type", () => {
      expectEq(typeof event.data.metricType, "string");
    })
    .it("should have event name", () => {
      expectEq(typeof event.data.eventName, "string");
    })
    .it("should have threshold value", () => {
      expectEq(typeof event.data.thresholdValue, "number");
    })
    .it("should have threshold unit", () => {
      expectEq(typeof event.data.thresholdUnit, "string");
    })
    .run(testId, event);
});

export const alertstestsCrashlyticsRegression = crashlytics.onRegressionAlertPublished((event) => {
  const testId = event.appId || "unknown";

  return new TestSuite("alerts crashlytics onRegressionAlertPublished")
    .it("should have app id", () => {
      expectEq(typeof event.appId, "string");
    })
    .it("should have issue data", () => {
      expectEq(typeof event.data.issue, "object");
    })
    .it("should have issue id", () => {
      expectEq(typeof event.data.issue.id, "string");
    })
    .it("should have issue title", () => {
      expectEq(typeof event.data.issue.title, "string");
    })
    .run(testId, event);
});

export const alertstestsBillingAutomated = billing.onPlanAutomatedUpdatePublished((event) => {
  const testId = event.appId || "unknown";

  return new TestSuite("alerts billing onPlanAutomatedUpdatePublished")
    .it("should have billing plan", () => {
      expectEq(typeof event.data.billingPlan, "string");
    })
    .it("should have notification type", () => {
      expectEq(typeof event.data.notificationType, "string");
    })
    .run(testId, event);
});
