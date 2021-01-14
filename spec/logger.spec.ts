import { expect } from 'chai';
import * as logger from '../src/logger';

const SUPPORTS_STRUCTURED_LOGS =
  parseInt(process.versions?.node?.split('.')?.[0] || '8', 10) >= 10;

describe(`logger (${
  SUPPORTS_STRUCTURED_LOGS ? 'structured' : 'unstructured'
})`, () => {
  let stdoutWrite = process.stdout.write.bind(process.stdout);
  let stderrWrite = process.stderr.write.bind(process.stderr);
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
    if (SUPPORTS_STRUCTURED_LOGS) {
      return expect(JSON.parse(last.trim())).to.deep.eq(entry);
    } else {
      // legacy logging is not structured, but do a sanity check
      return expect(last).to.include(entry.message);
    }
  }

  function expectStdout(entry: any) {
    return expectOutput(lastOut, entry);
  }

  function expectStderr(entry: any) {
    return expectOutput(lastErr, entry);
  }

  describe('logging methods', () => {
    it('should coalesce arguments into the message', () => {
      logger.log('hello', { middle: 'obj' }, 'end message');
      expectStdout({
        severity: 'INFO',
        message: "hello { middle: 'obj' } end message",
      });
    });

    it('should merge structured data from the last argument', () => {
      logger.log('hello', 'world', { additional: 'context' });
      expectStdout({
        severity: 'INFO',
        message: 'hello world',
        additional: 'context',
      });
    });

    it('should not recognize null as a structured logging object', () => {
      logger.log('hello', 'world', null);
      expectStdout({
        severity: 'INFO',
        message: 'hello world null',
      });
    });
  });

  describe('write', () => {
    describe('structured logging', () => {
      describe('write', () => {
        it('should remove circular references', () => {
          const circ: any = { b: 'foo' };
          circ.circ = circ;

          const entry: logger.LogEntry = {
            severity: 'ERROR',
            message: 'testing circular',
            circ,
          };
          logger.write(entry);
          expectStderr({
            severity: 'ERROR',
            message: 'testing circular',
            circ: { b: 'foo', circ: '[Circular]' },
          });
        });

        it('should remove circular references in arrays', () => {
          const circ: any = { b: 'foo' };
          circ.circ = [circ];

          const entry: logger.LogEntry = {
            severity: 'ERROR',
            message: 'testing circular',
            circ,
          };
          logger.write(entry);
          expectStderr({
            severity: 'ERROR',
            message: 'testing circular',
            circ: { b: 'foo', circ: ['[Circular]'] },
          });
        });

        for (const severity of ['DEBUG', 'INFO', 'NOTICE']) {
          it(`should output ${severity} severity to stdout`, () => {
            let entry: logger.LogEntry = {
              severity: severity as logger.LogSeverity,
              message: 'test',
            };
            logger.write(entry);
            expectStdout(entry);
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
          });
        }
      });
    });
  });
});
