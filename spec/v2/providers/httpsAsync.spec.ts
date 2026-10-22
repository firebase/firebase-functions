import { expect } from "chai";
import * as sinon from "sinon";
import * as https from "../../../src/v2/providers/https";
import * as logger from "../../../src/logger";
import { MockRequest } from "../../fixtures/mockrequest";
import { runHandler } from "../../helper";

describe("v2.https.onRequest async", () => {
  let loggerSpy: sinon.SinonSpy;

  beforeEach(() => {
    loggerSpy = sinon.spy(logger, "error");
  });

  afterEach(() => {
    loggerSpy.restore();
  });

  it("should catch and log unhandled rejections in async onRequest handlers", async () => {
    const err = new Error("boom");
    const fn = https.onRequest(async (_req, _res) => {
      await Promise.resolve();
      throw err;
    });

    const req = new MockRequest({}, {});
    req.method = "GET";

    const result = await runHandler(fn, req as any);

    expect(loggerSpy.calledWith("Unhandled error", err)).to.be.true;
    expect(result.status).to.equal(500);
    expect(result.body).to.equal("Internal Server Error");
  });

  it("should not log if handler completes successfully", async () => {
    const fn = https.onRequest(async (_req, res) => {
      await Promise.resolve();
      res.send(200);
    });

    const req = new MockRequest({}, {});
    req.method = "GET";

    await runHandler(fn, req as any);

    expect(loggerSpy.called).to.be.false;
  });
});
