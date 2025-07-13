import { onCall, onRequest } from "firebase-functions/v2/https";
import { expectEq, TestSuite } from "../testing";

export const callabletests = onCall({ invoker: "private" }, (req) => {
  return new TestSuite("v2 https onCall")
    .it("should have the correct data", (data: any) => expectEq(data?.foo, "bar"))
    .run(req.data.testId, req.data);
});

export const callabletestsStreaming = onCall(
  {
    invoker: "private",
    cors: true,
  },
  async (req, res) => {
    const testId = req.data.testId;

    // Check if client accepts streaming
    if (req.acceptsStreaming) {
      // Send multiple chunks
      await res.sendChunk({ chunk: 1, message: "First chunk" });
      await res.sendChunk({ chunk: 2, message: "Second chunk" });
      await res.sendChunk({ chunk: 3, message: "Third chunk" });

      return new TestSuite("v2 https onCall streaming")
        .it("should support streaming", () => expectEq(req.acceptsStreaming, true))
        .it("should have test data", () => expectEq(typeof testId, "string"))
        .run(testId, { streaming: true, chunks: 3 });
    } else {
      return new TestSuite("v2 https onCall non-streaming fallback")
        .it("should work without streaming", () => expectEq(req.acceptsStreaming, false))
        .run(testId, { streaming: false });
    }
  }
);

export const httpstests = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  (req, res) => {
    const testId = (req.query.testId as string) || "unknown";

    new TestSuite("v2 https onRequest")
      .it("should have request method", () => expectEq(typeof req.method, "string"))
      .it("should have request url", () => expectEq(typeof req.url, "string"))
      .it("should have request headers", () => expectEq(typeof req.headers, "object"))
      .it("should support GET requests", () => {
        if (req.method === "GET") {
          expectEq(req.method, "GET");
        }
      })
      .it("should support POST requests with body", () => {
        if (req.method === "POST") {
          expectEq(typeof req.body, "object");
        }
      })
      .run(testId, req);

    res.status(200).json({
      success: true,
      method: req.method,
      testId: testId,
    });
  }
);

export const httpstestsAuth = onRequest(
  {
    invoker: "private",
  },
  (req, res) => {
    const testId = (req.query.testId as string) || "unknown";

    new TestSuite("v2 https onRequest with auth")
      .it("should have authorization header", () => {
        expectEq(typeof req.headers.authorization, "string");
      })
      .run(testId, req);

    res.status(200).json({
      success: true,
      authenticated: true,
      testId: testId,
    });
  }
);
