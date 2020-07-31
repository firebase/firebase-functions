import { expect } from 'chai';
import * as sinon from 'sinon';
import * as logger from '../src/logger';

const SUPPORTS_STRUCTURED_LOGS =
  parseInt(process.versions?.node?.split('.')?.[0] || '8', 10) >= 10;

describe(`logger (${
  SUPPORTS_STRUCTURED_LOGS ? 'structured' : 'unstructured'
})`, () => {
  let sandbox: sinon.SinonSandbox;
  let stdoutStub: sinon.SinonStub;
  let stderrStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    stdoutStub = sandbox.stub(process.stdout, 'write');
    stderrStub = sandbox.stub(process.stderr, 'write');
  });

  function expectOutput(stdStub: sinon.SinonStub, entry: any) {
    if (SUPPORTS_STRUCTURED_LOGS) {
      return expect(
        JSON.parse((stdStub.getCalls()[0].args[0] as string).trim())
      ).to.deep.eq(entry);
    } else {
      // legacy logging is not structured, but do a sanity check
      return expect(stdStub.getCalls()[0].args[0]).to.include(entry.message);
    }
  }

  function expectStdout(entry: any) {
    return expectOutput(stdoutStub, entry);
  }

  function expectStderr(entry: any) {
    return expectOutput(stderrStub, entry);
  }

  describe('logging methods', () => {
    let writeStub: sinon.SinonStub;
    beforeEach(() => {
      writeStub = sinon.stub(logger, 'write');
    });

    afterEach(() => {
      writeStub.restore();
    });

    it('should coalesce arguments into the message', () => {
      logger.log('hello', { middle: 'obj' }, 'end message');
      expectStdout({
        severity: 'INFO',
        message: "hello { middle: 'obj' } end message",
      });
      sandbox.restore(); // to avoid swallowing test runner output
    });

    it('should merge structured data from the last argument', () => {
      logger.log('hello', 'world', { additional: 'context' });
      expectStdout({
        severity: 'INFO',
        message: 'hello world',
        additional: 'context',
      });
      sandbox.restore(); // to avoid swallowing test runner output
    });

    it('should not recognize null as a structured logging object', () => {
      logger.log('hello', 'world', null);
      expectStdout({
        severity: 'INFO',
        message: 'hello world null',
      });
      sandbox.restore(); // to avoid swallowing test runner output
    });
  });

  describe('write', () => {
    describe('structured logging', () => {
      describe('write', () => {
        for (const severity of ['DEBUG', 'INFO', 'NOTICE']) {
          it(`should output ${severity} severity to stdout`, () => {
            let entry: logger.LogEntry = {
              severity: severity as logger.LogSeverity,
              message: 'test',
            };
            logger.write(entry);
            expectStdout(entry);
            sandbox.restore(); // to avoid swallowing test runner output
          });
        }

        for (const severity of [
          'WARNING',
          'ERROR',
          'CRITICAL',
          'ALERT',
          'EMERGENCY',
        ]) {
          it(`should output ${severity} severity to stderr`, () => {
            let entry: logger.LogEntry = {
              severity: severity as logger.LogSeverity,
              message: 'test',
            };
            logger.write(entry);
            expectStderr(entry);
            sandbox.restore(); // to avoid swallowing test runner output
          });
        }
      });
    });
  });
});
