import { expect } from "chai";

import * as logger from "../src/logger";

describe("logger", () => {
  const stdoutWrite = process.stdout.write.bind(process.stdout);
  const stderrWrite = process.stderr.write.bind(process.stderr);
  let lastOut: string;
  let lastErr: string;

  beforeEach(() => {
    process.stdout.write = (msg: Buffer | string, cb?: any): boolean => {
      lastOut = msg as string;
      return stdoutWrite(msg, cb);
    };
    process.stderr.write = (msg: Buffer | string, cb?: any): boolean => {
      lastErr = msg as string;
      return stderrWrite(msg, cb);
    };
  });

  afterEach(() => {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  });

  function expectOutput(last: string, entry: any) {
    return expect(JSON.parse(last.trim())).to.deep.eq(entry);
  }

  function expectStdout(entry: any) {
    return expectOutput(lastOut, entry);
  }

  function expectStderr(entry: any) {
    return expectOutput(lastErr, entry);
  }

  describe("logging methods", () => {
    it("should coalesce arguments into the message", () => {
      logger.log("hello", { middle: "obj" }, "end message");
      expectStdout({
        severity: "INFO",
        message: "hello { middle: 'obj' } end message",
      });
    });

    it("should merge structured data from the last argument", () => {
      logger.log("hello", "world", { additional: "context" });
      expectStdout({
        severity: "INFO",
        message: "hello world",
        additional: "context",
      });
    });

    it("should not recognize null as a structured logging object", () => {
      logger.log("hello", "world", null);
      expectStdout({
        severity: "INFO",
        message: "hello world null",
      });
    });

    it("should overwrite a 'message' field in structured object if a message is provided", () => {
      logger.log("this instead", { test: true, message: "not this" });
      expectStdout({
        severity: "INFO",
        message: "this instead",
        test: true,
      });
    });

    it("should not overwrite a 'message' field in structured object if no other args are provided", () => {
      logger.log({ test: true, message: "this" });
      expectStdout({
        severity: "INFO",
        message: "this",
        test: true,
      });
    });
  });

  describe("write", () => {
    describe("structured logging", () => {
      describe("write", () => {
        it("should remove circular references", () => {
          const circ: any = { b: "foo" };
          circ.circ = circ;

          const entry: logger.LogEntry = {
            severity: "ERROR",
            message: "testing circular",
            circ,
          };
          logger.write(entry);
          expectStderr({
            severity: "ERROR",
            message: "testing circular",
            circ: { b: "foo", circ: "[Circular]" },
          });
        });

        it("should remove circular references in arrays", () => {
          const circ: any = { b: "foo" };
          circ.circ = [circ];

          const entry: logger.LogEntry = {
            severity: "ERROR",
            message: "testing circular",
            circ,
          };
          logger.write(entry);
          expectStderr({
            severity: "ERROR",
            message: "testing circular",
            circ: { b: "foo", circ: ["[Circular]"] },
          });
        });

        it("should not detect duplicate object as circular", () => {
          const obj: any = { a: "foo" };
          const entry: logger.LogEntry = {
            severity: "ERROR",
            message: "testing circular",
            a: obj,
            b: obj,
          };
          logger.write(entry);
          expectStderr({
            severity: "ERROR",
            message: "testing circular",
            a: { a: "foo" },
            b: { a: "foo" },
          });
        });

        it("should not detect duplicate object in array as circular", () => {
          const obj: any = { a: "foo" };
          const arr: any = [
            { a: obj, b: obj },
            { a: obj, b: obj },
          ];
          const entry: logger.LogEntry = {
            severity: "ERROR",
            message: "testing circular",
            a: arr,
            b: arr,
          };
          logger.write(entry);
          expectStderr({
            severity: "ERROR",
            message: "testing circular",
            a: [
              { a: { a: "foo" }, b: { a: "foo" } },
              { a: { a: "foo" }, b: { a: "foo" } },
            ],
            b: [
              { a: { a: "foo" }, b: { a: "foo" } },
              { a: { a: "foo" }, b: { a: "foo" } },
            ],
          });
        });

        it("should not break on objects that override toJSON", () => {
          const obj: any = { a: new Date("August 26, 1994 12:24:00Z") };

          const entry: logger.LogEntry = {
            severity: "ERROR",
            message: "testing toJSON",
            obj,
          };
          logger.write(entry);
          expectStderr({
            severity: "ERROR",
            message: "testing toJSON",
            obj: { a: "1994-08-26T12:24:00.000Z" },
          });
        });

        it("should not alter parameters that are logged", () => {
          const circ: any = { b: "foo" };
          circ.array = [circ];
          circ.object = circ;
          const entry: logger.LogEntry = {
            severity: "ERROR",
            message: "testing circular",
            circ,
          };
          logger.write(entry);

          expect(circ.array[0].b).to.equal("foo");
          expect(circ.object.b).to.equal("foo");
          expect(circ.object.array[0].object.array[0].b).to.equal("foo");
        });

        for (const severity of ["DEBUG", "INFO", "NOTICE"]) {
          it(`should output ${severity} severity to stdout`, () => {
            const entry: logger.LogEntry = {
              severity: severity as logger.LogSeverity,
              message: "test",
            };
            logger.write(entry);
            expectStdout(entry);
          });
        }

        for (const severity of ["WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY"]) {
          it(`should output ${severity} severity to stderr`, () => {
            const entry: logger.LogEntry = {
              severity: severity as logger.LogSeverity,
              message: "test",
            };
            logger.write(entry);
            expectStderr(entry);
          });
        }
      });
    });
  });

  describe("compat", () => {
    const originalConsole = {
      debug: console.debug,
      info: console.info,
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    before(async () => {
      // Patch global console methods
      await import("../src/logger/compat");
    });

    beforeEach(() => {
      lastOut = "";
      lastErr = "";
    });

    after(() => {
      // Restore original console methods so other tests remain unaffected
      console.debug = originalConsole.debug;
      console.info = originalConsole.info;
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    });

    it("should patch console.log with INFO severity", () => {
      console.log("test info log");
      expectStdout({
        severity: "INFO",
        message: "test info log",
      });
    });

    it("should patch console.log with no arguments", () => {
      console.log();
      expectStdout({
        severity: "INFO",
        message: "",
      });
    });

    it("should patch console.info with INFO severity", () => {
      console.info("test info log");
      expectStdout({
        severity: "INFO",
        message: "test info log",
      });
    });

    it("should patch console.debug with DEBUG severity", () => {
      console.debug("test debug log");
      expectStdout({
        severity: "DEBUG",
        message: "test debug log",
      });
    });

    it("should patch console.warn with WARNING severity", () => {
      console.warn("test warning log");
      expectStderr({
        severity: "WARNING",
        message: "test warning log",
      });
    });

    it("should patch console.error with ERROR severity without creating synthetic stack trace for string messages", () => {
      // String error messages should not have synthetic Error stacks added (Issue #1945)
      console.error("test error message");
      expectStderr({
        severity: "ERROR",
        message: "test error message",
      });
    });

    it("should patch console.error for Error objects preserving the original stack", () => {
      // Error instances should retain their original stack trace without double wrapping
      const err = new Error("real error");
      console.error(err);
      const parsed = JSON.parse(lastErr.trim()) as logger.LogEntry;
      expect(parsed.severity).to.eq("ERROR");
      expect(parsed.message).to.contain("Error: real error");
      expect(parsed.message).to.not.contain("Error: Error: real error");
    });

    it("should format multiple arguments in console.error", () => {
      console.error("failed with code %d: %s", 500, "internal error");
      expectStderr({
        severity: "ERROR",
        message: "failed with code 500: internal error",
      });
    });
  });
});
