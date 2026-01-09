import { describe, it, beforeAll, expect, assertType } from "vitest";
import { CloudTasksClient } from "@google-cloud/tasks";
import { RUN_ID, waitForEvent } from "../utils";
import { getFunctionUrl } from "../firebase.server";
import { config } from "../config";

const QUEUE_NAME = "test-tasksOnTaskDispatchedTrigger";

describe("tasks.v2", () => {
  describe("onTaskDispatched", () => {
    let data: any;

    beforeAll(async () => {
      data = await waitForEvent("onTaskDispatched", async () => {
        const client = new CloudTasksClient({
          projectId: config.projectId,
        });

        const serviceAccountEmail = `${config.projectId}@appspot.gserviceaccount.com`;

        await client.createTask({
          parent: client.queuePath(config.projectId, "us-central1", QUEUE_NAME),
          task: {
            httpRequest: {
              httpMethod: "POST",
              url: await getFunctionUrl(QUEUE_NAME),
              headers: {
                "Content-Type": "application/json",
              },
              oidcToken: {
                serviceAccountEmail,
              },
              body: Buffer.from(
                JSON.stringify({
                  data: {
                    id: RUN_ID,
                  },
                })
              ).toString("base64"),
            },
          },
        });
      });
    }, 60_000);

    it("should have the correct data", () => {
      expect(data.data.id).toBe(RUN_ID);
      expect(data.executionCount).toBe(0);
      expect(data.id).toBeDefined();
      assertType<string>(data.id);
      expect(data.id.length).toBeGreaterThan(0);
      expect(data.queueName).toBe(QUEUE_NAME);
      expect(data.retryCount).toBe(0);

      // TODO(ehesp): This should be a valid datetime string, but it comes through as
      // a precision unix timestamp - looks like a bug to be fixed.
      expect(data.scheduledTime).toBeDefined();
    });
  });
});
