import { expect } from "chai";
import * as sinon from "sinon";
import * as https from "../../../src/v1/providers/https";
import * as logger from "../../../src/logger";
import { MockRequest } from "../../fixtures/mockrequest";
import { runHandler } from "../../helper";

describe("CloudHttpsBuilder async onRequest", () => {
  let loggerSpy: sinon.SinonSpy;

  beforeEach(() => {
    loggerSpy = sinon.spy(logger, "error");
  });

  afterEach(() => {
    loggerSpy.restore();
  });

  it("should catch and log unhandled rejections in async onRequest handlers", async () => {
    const error = new Error("Async error");
    const fn = https.onRequest(async (_req, _res) => {
      throw error;
    });

    const req = new MockRequest({}, {});
    req.method = "GET";

    await runHandler(fn, req as any);

    expect(loggerSpy.calledWith("Unhandled error", error)).to.be.true;
  });

  it("should not log if handler completes successfully", async () => {
    const fn = https.onRequest(async (_req, res) => {
      res.send(200);
    });

    const req = new MockRequest({}, {});
    req.method = "GET";

    await runHandler(fn, req as any);

    expect(loggerSpy.called).to.be.false;
  });
});
