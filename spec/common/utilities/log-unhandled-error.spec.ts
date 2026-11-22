import { expect } from "chai";

import { logUnhandledError } from "../../../src/common/utilities/log-unhandled-error";

describe("logUnhandledError", () => {
  const stderrWrite = process.stderr.write.bind(process.stderr);
  let lastErr: string;

  beforeEach(() => {
    process.stderr.write = (msg: Buffer | string, cb?: any): boolean => {
      lastErr = msg as string;
      return stderrWrite(msg, cb);
    };
  });

  afterEach(() => {
    process.stderr.write = stderrWrite;
  });

  function lastEntry(): Record<string, unknown> {
    return JSON.parse(lastErr.trim());
  }

  it("logs an Error with its own stack", () => {
    const err = new Error("boom");

    logUnhandledError(err);

    const entry = lastEntry();
    expect(entry.severity).to.equal("ERROR");
    expect(entry.message).to.equal(`Unhandled error ${err.stack}`);
  });

  it("keeps a thrown plain object's fields in the message", () => {
    logUnhandledError({ code: "E_X", message: "quota exceeded" });

    const entry = lastEntry();
    expect(entry.severity).to.equal("ERROR");
    expect(entry.message).to.include("quota exceeded");
    expect(entry.message).to.include("E_X");
    expect(entry).to.not.have.property("code");
  });

  it("logs a thrown string", () => {
    logUnhandledError("boom");

    expect(lastEntry().message).to.match(/^Error: Unhandled error boom\n/);
  });

  it("logs a thrown null", () => {
    logUnhandledError(null);

    expect(lastEntry().message).to.match(/^Error: Unhandled error null\n/);
  });
});
