import * as admin from "firebase-admin";
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
import { REGION } from "../region";

export const alertsOnAlertPublishedTests = onAlertPublished("crashlytics.issue", async (event) => {
  const testId = event.data.payload.testId;

  try {
    await admin
      .firestore()
      .collection("alertsOnAlertPublishedTests")
      .doc(testId)
      .set({ event: JSON.stringify(event) });
  } catch (error) {
    console.error(`Error handling alert for testId: ${testId}`, error);
  }
});

export const alertsOnInAppFeedbackPublishedTests = onInAppFeedbackPublished(async (event) => {
  const testId = event.data.payload.testerName;

  if (!testId) {
    console.error("TestId not found for onInAppFeedbackPublished");
    return;
  }

  try {
    await admin
      .firestore()
      .collection("alertsOnInAppFeedbackPublishedTests")
      .doc(testId)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error creating test record for testId: ${testId}`, error);
  }
});

export const alertsOnNewTesterIosDevicePublishedTests = onNewTesterIosDevicePublished(
  async (event) => {
    const testId = event.data.payload.testerName;

    if (!testId) {
      console.error("TestId not found for onNewTesterIosDevicePublished");
      return;
    }

    try {
      await admin
        .firestore()
        .collection("alertsOnNewTesterIosDevicePublishedTests")
        .doc(testId)
        .set({
          event: JSON.stringify(event),
        });
    } catch (error) {
      console.error(`Error creating test record for testId: ${testId}`, error);
    }
  }
);

export const alertsOnPlanAutomatedUpdatePublishedTests = onPlanAutomatedUpdatePublished(
  async (event) => {
    const testId = event.data.payload.billingPlan;

    if (!testId) {
      console.error("TestId not found for onPlanAutomatedUpdatePublished");
      return;
    }

    try {
      await admin
        .firestore()
        .collection("alertsOnPlanAutomatedUpdatePublishedTests")
        .doc(testId)
        .set({
          event: JSON.stringify(event),
        });
    } catch (error) {
      console.error(`Error creating test record for testId: ${testId}`, error);
    }
  }
);

export const alertsOnPlanUpdatePublishedTests = onPlanUpdatePublished(async (event) => {
  const testId = event.data.payload.billingPlan;

  if (!testId) {
    console.error("TestId not found for onPlanUpdatePublished");
    return;
  }

  try {
    await admin
      .firestore()
      .collection("alertsOnPlanUpdatePublishedTests")
      .doc(testId)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error creating test record for testId: ${testId}`, error);
  }
});

export const alertsOnNewAnrIssuePublishedTests = onNewAnrIssuePublished(async (event) => {
  const testId = event.data.payload.issue.title;

  try {
    await admin
      .firestore()
      .collection("alertsOnNewAnrIssuePublishedTests")
      .doc(testId)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error creating test record for testId: ${testId}`, error);
  }
});

export const alertsOnNewFatalIssuePublishedTests = onNewFatalIssuePublished(async (event) => {
  const testId = event.data.payload.issue.title;

  try {
    await admin
      .firestore()
      .collection("alertsOnNewFatalIssuePublishedTests")
      .doc(testId)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error creating test record for testId: ${testId}`, error);
  }
});

export const alertsOnNewNonFatalIssuePublishedTests = onNewNonfatalIssuePublished(async (event) => {
  const testId = event.data.payload.issue.title;

  try {
    await admin
      .firestore()
      .collection("alertsOnNewFatalIssuePublishedTests")
      .doc(testId)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error creating test record for testId: ${testId}`, error);
  }
});

export const alertsOnRegressionAlertPublishedTests = onRegressionAlertPublished(async (event) => {
  const testId = event.data.payload.issue.title;

  try {
    await admin
      .firestore()
      .collection("alertsOnRegressionAlertPublishedTests")
      .doc(testId)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error creating test record for testId: ${testId}`, error);
  }
});

export const alertsOnStabilityDigestPublishedTests = onStabilityDigestPublished(async (event) => {
  const testId = event.data.payload.trendingIssues[0].issue.title;

  try {
    await admin
      .firestore()
      .collection("alertsOnRegressionAlertPublishedTests")
      .doc(testId)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error creating test record for testId: ${testId}`, error);
  }
});

export const alertsOnVelocityAlertPublishedTests = onVelocityAlertPublished(async (event) => {
  const testId = event.data.payload.issue.title;

  try {
    await admin
      .firestore()
      .collection("alertsOnVelocityAlertPublishedTests")
      .doc(testId)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error creating test record for testId: ${testId}`, error);
  }
});

export const alertsOnThresholdAlertPublishedTests = onThresholdAlertPublished(async (event) => {
  const testId = event.data.payload.eventName;

  try {
    await admin
      .firestore()
      .collection("alertsOnThresholdAlertPublishedTests")
      .doc(testId)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error creating test record for testId: ${testId}`, error);
  }
});
