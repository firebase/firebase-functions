// The MIT License (MIT)
//
// Copyright (c) 2024 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { expect } from "chai";
import * as ai from "../../../src/v2/providers/ai";
import { runHandler } from "../../helper";
import { MockRequest } from "../../fixtures/mockrequest";
import {
  requestTypeName as geminiV1BetaRequestTypeName,
  responseTypeName as geminiV1BetaResponseTypeName,
} from "../../../src/v2/providers/ai/types/gemini/v1beta";
import {
  requestTypeName as vertexV1Beta1RequestTypeName,
  responseTypeName as vertexV1Beta1ResponseTypeName,
} from "../../../src/v2/providers/ai/types/vertex/v1beta1";

function assertJsonResponse(result: any, expectedStatus: number, expectedBody: any) {
  expect(result.status).to.equal(expectedStatus);
  if (result.body && typeof result.body === "string" && expectedBody !== undefined) {
    try {
      expect(JSON.parse(result.body)).to.deep.equal(expectedBody);
      return;
    } catch {
      // fallback if not JSON
    }
  }
  expect(result.body).to.deep.equal(expectedBody);
}

// We need to cast here because our mock type doesn't implement the full express format.
// We should eventually get around to launching the server and just calling fetch against it.
// tslint:disable-next-line:no-any
function request(body: any, headers: Record<string, string> = {}): any {
  return new MockRequest(body, headers);
}

describe("v2.ai", () => {
  describe("beforeGenerateContent (CloudEvent Structured Encoding)", () => {
    let req: any;

    beforeEach(() => {
      req = {
        body: {
          specversion: "1.0",
          type: ai.beforeGenerateEventType,
          source: "//aiplatform.googleapis.com/projects/foo",
          authType: "app_user",
          data: {
            model: "gemini-pro",
            api: ai.geminiV1Beta,
            request: {
              contents: [{ role: "user", parts: [{ text: "hello" }] }],
            },
          },
        },
      };
    });

    it("should parse generic body and provide gemini typing", async () => {
      const hook = ai.beforeGenerateContent((event) => {
        const api = event.data.api;
        if (api === ai.geminiV1Beta) {
          const geminiReq = event.data.request;
          expect(geminiReq.contents[0].role).to.equal("user");
        }
        return {
          systemInstruction: { role: "system", parts: [{ text: "Hello from AI" }] },
        };
      });

      const result = await runHandler(
        hook,
        request(JSON.stringify(req.body), { "content-type": "application/json" })
      );

      assertJsonResponse(result, 200, {
        systemInstruction: { role: "system", parts: [{ text: "Hello from AI" }] },
        "@type": geminiV1BetaRequestTypeName,
      });
    });

    it("should parse generic body and provide vertex typing", async () => {
      req.body.data.api = ai.vertexV1Beta1;

      const hook = ai.beforeGenerateContent((event) => {
        if (event.data.api === ai.vertexV1Beta1) {
          const vertexReq = event.data.request;
          expect(vertexReq.contents[0].parts[0].text).to.equal("hello");
        }
        return {};
      });

      const result = await runHandler(hook, request(req.body));

      assertJsonResponse(result, 200, {
        "@type": vertexV1Beta1RequestTypeName,
      });
    });

    it("should handle HttpsError gracefully", async () => {
      const hook = ai.beforeGenerateContent(() => {
        throw new ai.HttpsError("invalid-argument", "Missing required fields");
      });

      const result = await runHandler(hook, request(req.body));

      assertJsonResponse(result, 500, {
        code: 3,
        message: "Missing required fields",
      });
    });

    it("should handle unhandled exceptions gracefully", async () => {
      const hook = ai.beforeGenerateContent(() => {
        throw new Error("Oh no!");
      });

      const result = await runHandler(hook, request(req.body));

      assertJsonResponse(result, 500, {
        code: 13,
        message: "Internal error.",
      });
    });

    it("should default to empty object when handler returns void", async () => {
      const hook = ai.beforeGenerateContent(() => {
        // returning nothing
      });

      const result = await runHandler(hook, request(req.body));

      assertJsonResponse(result, 200, {
        "@type": geminiV1BetaRequestTypeName,
      });
    });
  });

  describe("afterGenerateContent", () => {
    let req: any;

    beforeEach(() => {
      req = {
        body: {
          specversion: "1.0",
          type: ai.afterGenerateEventType,
          source: "//aiplatform.googleapis.com/projects/foo",
          authType: "app_user",
          data: {
            model: "gemini-pro",
            api: ai.geminiV1Beta,
            request: {
              contents: [{ role: "user", parts: [{ text: "hello" }] }],
            },
            response: {
              candidates: [{ content: { parts: [{ text: "hi!" }] } }],
            },
          },
        },
      };
    });

    it("should parse generic body and handle successful response modification", async () => {
      const hook = ai.afterGenerateContent((event) => {
        const api = event.data.api;
        if (api === ai.geminiV1Beta) {
          const geminiResp = event.data.response;
          expect(geminiResp.candidates[0].content.parts[0].text).to.equal("hi!");
        }
        return {
          candidates: [{ index: 0, content: { role: "model", parts: [{ text: "hi there!" }] } }],
        };
      });

      const result = await runHandler(hook, request(req.body));

      assertJsonResponse(result, 200, {
        candidates: [{ index: 0, content: { role: "model", parts: [{ text: "hi there!" }] } }],
        "@type": geminiV1BetaResponseTypeName,
      });
    });

    it("should parse generic body and handle successful response modification for vertex", async () => {
      req.body.data.api = ai.vertexV1Beta1;

      const hook = ai.afterGenerateContent((event) => {
        if (event.data.api === ai.vertexV1Beta1) {
          const vertexResp = event.data.response;
          expect(vertexResp.candidates[0].content.parts[0].text).to.equal("hi!");
        }
        return {};
      });

      const result = await runHandler(hook, request(req.body));

      assertJsonResponse(result, 200, {
        "@type": vertexV1Beta1ResponseTypeName,
      });
    });

    it("should handle HttpsError gracefully", async () => {
      const hook = ai.afterGenerateContent(() => {
        throw new ai.HttpsError("permission-denied", "Not allowed to generate");
      });

      const result = await runHandler(hook, request(req.body));

      assertJsonResponse(result, 500, {
        code: 7,
        message: "Not allowed to generate",
      });
    });

    it("should handle unhandled exceptions gracefully", async () => {
      const hook = ai.afterGenerateContent(() => {
        throw new Error("Oh no!");
      });

      const result = await runHandler(hook, request(req.body));

      assertJsonResponse(result, 500, {
        code: 13,
        message: "Internal error.",
      });
    });

    it("should default to empty object when handler returns void", async () => {
      const hook = ai.afterGenerateContent(() => {
        // returning nothing
      });

      const result = await runHandler(hook, request(req.body));

      assertJsonResponse(result, 200, {
        "@type": geminiV1BetaResponseTypeName,
      });
    });
  });
  describe("Typings", () => {
    it("should allow regional webhooks to specify multiple locations", () => {
      ai.beforeGenerateContent({ regionalWebhook: true, region: ["us-central1", "europe-west1"] }, () => {});
    });

    it("should allow global webhooks to specify a single location", () => {
      ai.beforeGenerateContent({ region: "us-central1" }, () => {});
    });

    it("should allow regional webhooks to specify a single location", () => {
      ai.beforeGenerateContent({ regionalWebhook: true, region: "us-central1" }, () => {});
    });

    // Compilation failure tests (commented out):
    // it("should NOT allow global webhooks to specify multiple locations", () => {
    //   ai.beforeGenerateContent({ region: ["us-central1", "europe-west1"] }, () => {});
    // });
  });
});
