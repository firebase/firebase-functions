import { describe, it, beforeAll, expect } from "vitest";
import { waitForEvent } from "../utils";
import Scheduler from "@google-cloud/scheduler";
import { config } from "../config";

const region = "us-central1";
// See https://firebase.google.com/docs/functions/schedule-functions#deploy_a_scheduled_function
const scheduleName = `firebase-schedule-test-schedulerOnScheduleTrigger-${region}`;
const jobName = `projects/${config.projectId}/locations/${region}/jobs/${scheduleName}`;

describe("scheduler.v2", () => {
  describe("onSchedule", () => {
    let data: any;

    beforeAll(async () => {
      data = await waitForEvent("onSchedule", async () => {
        const client = new Scheduler.v1beta1.CloudSchedulerClient({
          projectId: config.projectId,
        });

        await client.runJob({
          name: jobName,
        });
      });
    }, 60_000);

    it("should have the correct data", () => {
      expect(data.jobName).toBe(scheduleName);
      expect(Date.parse(data.scheduleTime)).toBeGreaterThan(0);
    });
  });
});
