// import * as admin from "firebase-admin";
import { onAlertPublished } from "firebase-functions/v2/alerts";
import {
  onInAppFeedbackPublished,
  onNewTesterIosDevicePublished,
} from "firebase-functions/v2/alerts/appDistribution";
import {
  onPlanAutomatedUpdatePublished,
  onPlanUpdatePublished,
} from "firebase-functions/v2/alerts/billing";
import {
  onNewAnrIssuePublished,
  onNewFatalIssuePublished,
  onNewNonfatalIssuePublished,
  onRegressionAlertPublished,
  onStabilityDigestPublished,
  onVelocityAlertPublished,
} from "firebase-functions/v2/alerts/crashlytics";
import { onThresholdAlertPublished } from "firebase-functions/v2/alerts/performance";

// TODO: All this does is test that the function is deployable.
// Since you cannot directly trigger alerts in a CI environment, we cannot test
// the internals without mocking.

export const alertsOnAlertPublishedTests = onAlertPublished(
  "crashlytics.newFatalIssue",
  async (event) => {
    // const testId = event.data.payload.testId;
    // await admin
    //   .firestore()
    //   .collection("alertsOnAlertPublishedTests")
    //   .doc(testId)
    //   .set({ event: JSON.stringify(event) });
  }
);

export const alertsOnInAppFeedbackPublishedTests = onInAppFeedbackPublished(async (event) => {
  // const testId = event.data.payload.text;
  // await admin
  //   .firestore()
  //   .collection("alertsOnInAppFeedbackPublishedTests")
  //   .doc(testId)
  //   .set({
  //     event: JSON.stringify(event),
  //   });
});

export const alertsOnNewTesterIosDevicePublishedTests = onNewTesterIosDevicePublished(
  async (event) => {
    // const testId = event.data.payload.testerName;
    // await admin
    //   .firestore()
    //   .collection("alertsOnNewTesterIosDevicePublishedTests")
    //   .doc(testId)
    //   .set({
    //     event: JSON.stringify(event),
    //   });
  }
);

export const alertsOnPlanAutomatedUpdatePublishedTests = onPlanAutomatedUpdatePublished(
  async (event) => {
    // const testId = event.data.payload.billingPlan;
    // await admin
    //   .firestore()
    //   .collection("alertsOnPlanAutomatedUpdatePublishedTests")
    //   .doc(testId)
    //   .set({
    //     event: JSON.stringify(event),
    //   });
  }
);

export const alertsOnPlanUpdatePublishedTests = onPlanUpdatePublished(async (event) => {
  // const testId = event.data.payload.billingPlan;
  // await admin
  //   .firestore()
  //   .collection("alertsOnPlanUpdatePublishedTests")
  //   .doc(testId)
  //   .set({
  //     event: JSON.stringify(event),
  //   });
});

export const alertsOnNewAnrIssuePublishedTests = onNewAnrIssuePublished(async (event) => {
  // const testId = event.data.payload.issue.title;
  // await admin
  //   .firestore()
  //   .collection("alertsOnNewAnrIssuePublishedTests")
  //   .doc(testId)
  //   .set({
  //     event: JSON.stringify(event),
  //   });
});

export const alertsOnNewFatalIssuePublishedTests = onNewFatalIssuePublished(async (event) => {
  // const testId = event.data.payload.issue.title;
  // await admin
  //   .firestore()
  //   .collection("alertsOnNewFatalIssuePublishedTests")
  //   .doc(testId)
  //   .set({
  //     event: JSON.stringify(event),
  //   });
});

export const alertsOnNewNonFatalIssuePublishedTests = onNewNonfatalIssuePublished(async (event) => {
  // const testId = event.data.payload.issue.title;
  // await admin
  //   .firestore()
  //   .collection("alertsOnNewFatalIssuePublishedTests")
  //   .doc(testId)
  //   .set({
  //     event: JSON.stringify(event),
  //   });
});

export const alertsOnRegressionAlertPublishedTests = onRegressionAlertPublished(async (event) => {
  // const testId = event.data.payload.issue.title;
  // await admin
  //   .firestore()
  //   .collection("alertsOnRegressionAlertPublishedTests")
  //   .doc(testId)
  //   .set({
  //     event: JSON.stringify(event),
  //   });
});

export const alertsOnStabilityDigestPublishedTests = onStabilityDigestPublished(async (event) => {
  // const testId = event.data.payload.trendingIssues[0].issue.title;
  // await admin
  //   .firestore()
  //   .collection("alertsOnRegressionAlertPublishedTests")
  //   .doc(testId)
  //   .set({
  //     event: JSON.stringify(event),
  //   });
});

export const alertsOnVelocityAlertPublishedTests = onVelocityAlertPublished(async (event) => {
  // const testId = event.data.payload.issue.title;
  // await admin
  //   .firestore()
  //   .collection("alertsOnVelocityAlertPublishedTests")
  //   .doc(testId)
  //   .set({
  //     event: JSON.stringify(event),
  //   });
});

export const alertsOnThresholdAlertPublishedTests = onThresholdAlertPublished(async (event) => {
  // const testId = event.data.payload.eventName;
  // await admin
  //   .firestore()
  //   .collection("alertsOnThresholdAlertPublishedTests")
  //   .doc(testId)
  //   .set({
  //     event: JSON.stringify(event),
  //   });
});
