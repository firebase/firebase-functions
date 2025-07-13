import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { expectEq, TestSuite } from "../testing";

export const pubsubtests = onMessagePublished("v2-pubsub-test-topic", (event) => {
  return new TestSuite("pubsub onMessagePublished")
    .it("should have message data", () => {
      const data = JSON.parse(Buffer.from(event.data.message.data, "base64").toString());
      expectEq(data.testId, event.data.message.attributes?.testId);
    })
    .it("should have message attributes", () => {
      expectEq(typeof event.data.message.attributes?.testId, "string");
    })
    .it("should have message id", () => {
      expectEq(typeof event.data.message.messageId, "string");
    })
    .it("should have publish time", () => {
      expectEq(typeof event.data.message.publishTime, "string");
    })
    .run(event.data.message.attributes?.testId || "unknown", event.data);
});

export const pubsubtestsWithRetry = onMessagePublished(
  {
    topic: "v2-pubsub-test-retry-topic",
    retry: true,
  },
  (event) => {
    const testId = event.data.message.attributes?.testId || "unknown";
    const attempt = parseInt(event.data.message.attributes?.attempt || "1");

    // Fail on first attempt to test retry
    if (attempt === 1) {
      throw new Error("Intentional failure to test retry");
    }

    return new TestSuite("pubsub onMessagePublished with retry")
      .it("should retry on failure", () => {
        expectEq(attempt > 1, true);
      })
      .it("should have message data", () => {
        const data = JSON.parse(Buffer.from(event.data.message.data, "base64").toString());
        expectEq(data.testRetry, true);
      })
      .run(testId, event.data);
  }
);
