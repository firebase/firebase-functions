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
import * as sinon from "sinon";
import * as ai from "../../../src/v2/providers/ai";

describe("v2.ai", () => {
  describe("beforeGenerateContent (CloudEvent Structured Encoding)", () => {
    let req: any;
    let res: any;

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
      res = {
        status: sinon.stub().returnsThis(),
        send: sinon.stub(),
      };
    });

    it("should parse generic body and provide gemini typing", async () => {
      const hook = ai.beforeGenerateContent((event) => {
        // Testing types (compiler will check this)
        const api = event.data.api;
        if (api === ai.geminiV1Beta) {
          const geminiReq = event.data.request;
          expect(geminiReq.contents[0].role).to.equal("user");
        }
        return {
          systemInstruction: { role: "system", parts: [{ text: "Hello from AI" }] },
        };
      });

      await hook(req as any, res as any);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.send, {
        systemInstruction: { role: "system", parts: [{ text: "Hello from AI" }] },
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

      await hook(req as any, res as any);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.send, {});
    });

    it("should handle HttpsError gracefully", async () => {
      const hook = ai.beforeGenerateContent((event) => {
        throw new ai.HttpsError("invalid-argument", "Missing required fields");
      });

      await hook(req as any, res as any);

      sinon.assert.calledWith(res.status, 500);
      sinon.assert.calledWith(res.send, {
        code: 3, // invalid-argument
        message: "Missing required fields",
      });
    });

    it("should handle unhandled exceptions gracefully", async () => {
      const hook = ai.beforeGenerateContent((event) => {
        throw new Error("Oh no!");
      });

      await hook(req as any, res as any);

      sinon.assert.calledWith(res.status, 500);
      sinon.assert.calledWith(res.send, {
        code: 13, // internal
        message: "Internal error.",
      });
    });

    it("should default to empty object when handler returns void", async () => {
      const hook = ai.beforeGenerateContent((event) => {
        // returning nothing
      });

      await hook(req as any, res as any);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.send, {});
    });
  });

  describe("afterGenerateContent", () => {
    let req: any;
    let res: any;

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
      res = {
        status: sinon.stub().returnsThis(),
        send: sinon.stub(),
      };
    });

    it("should parse generic body and handle successful response modification", async () => {
      const hook = ai.afterGenerateContent((event) => {
        const api = event.data.api;
        if (api === ai.geminiV1Beta) {
          const geminiResp = event.data.response;
          expect(geminiResp.candidates![0].content.parts[0].text).to.equal("hi!");
        }
        return {
          candidates: [{ index: 0, content: { role: "model", parts: [{ text: "hi there!" }] } }],
        };
      });

      await hook(req as any, res as any);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWithMatch(res.send, {
        candidates: [{ index: 0, content: { role: "model", parts: [{ text: "hi there!" }] } }],
      });
    });

    it("should handle HttpsError gracefully", async () => {
      const hook = ai.afterGenerateContent((event) => {
        throw new ai.HttpsError("permission-denied", "Not allowed to generate");
      });

      await hook(req as any, res as any);

      sinon.assert.calledWith(res.status, 500);
      sinon.assert.calledWith(res.send, {
        code: 7, // permission-denied
        message: "Not allowed to generate",
      });
    });

    it("should handle unhandled exceptions gracefully", async () => {
      const hook = ai.afterGenerateContent((event) => {
        throw new Error("Oh no!");
      });

      await hook(req as any, res as any);

      sinon.assert.calledWith(res.status, 500);
      sinon.assert.calledWith(res.send, {
        code: 13, // internal
        message: "Internal error.",
      });
    });

    it("should default to empty object when handler returns void", async () => {
      const hook = ai.afterGenerateContent((event) => {
        // returning nothing
      });

      await hook(req as any, res as any);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.send, {});
    });
  });
});
