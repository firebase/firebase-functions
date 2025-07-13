import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { expectEq, TestSuite } from "../testing";

export const taskstests = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 3,
      minBackoffSeconds: 1,
    },
    rateLimits: {
      maxConcurrentDispatches: 10,
    },
  },
  (req) => {
    const { testId, taskData } = req.data;

    return new TestSuite("tasks onTaskDispatched")
      .it("should have task data", () => {
        expectEq(taskData.message, "Hello from task queue");
      })
      .it("should have auth context if authenticated", () => {
        if (req.auth) {
          expectEq(typeof req.auth.uid, "string");
        } else {
          expectEq(req.auth, undefined);
        }
      })
      .run(testId, req);
  }
);

export const taskstestsWithRetry = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 3,
      minBackoffSeconds: 1,
      maxBackoffSeconds: 10,
    },
  },
  (req) => {
    const { testId, attempt = 1 } = req.data;

    // Fail on first attempt to test retry
    if (attempt === 1) {
      throw new Error("Intentional failure to test retry");
    }

    return new TestSuite("tasks onTaskDispatched with retry")
      .it("should retry on failure", () => {
        expectEq(attempt > 1, true);
      })
      .it("should have retry data", () => {
        expectEq(req.data.testRetry, true);
      })
      .run(testId, req);
  }
);
