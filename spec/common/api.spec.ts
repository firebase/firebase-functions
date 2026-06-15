import { expect } from "chai";
import { requiresAPI, getGlobalRequiredAPIs, clearGlobalRequiredAPIs } from "../../src/common/api";

describe("requiresAPI", () => {
  afterEach(() => {
    clearGlobalRequiredAPIs();
  });

  it("stores required API", () => {
    requiresAPI("test.googleapis.com", "reason");
    expect(getGlobalRequiredAPIs()).to.deep.equal([
      { api: "test.googleapis.com", reason: "reason" },
    ]);
  });

  it("throws error for invalid API", () => {
    expect(() => requiresAPI("" as any, "reason")).to.throw(
      "requiresAPI: 'api' must be a non-empty string ending with '.googleapis.com'."
    );
    expect(() => requiresAPI(null as any, "reason")).to.throw(
      "requiresAPI: 'api' must be a non-empty string ending with '.googleapis.com'."
    );
    expect(() => requiresAPI("invalid-api" as any, "reason")).to.throw(
      "requiresAPI: 'api' must be a non-empty string ending with '.googleapis.com'."
    );
  });
});
