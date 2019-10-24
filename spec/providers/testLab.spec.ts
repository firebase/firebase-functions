// The MIT License (MIT)
//
// Copyright (c) 2019 Firebase
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

import { expect } from 'chai';

import * as testLab from '../../src/providers/testLab';

describe('Test Lab Functions', () => {
  describe('#onComplete', () => {
    describe('with process.env.GCLOUD_PROJECT set', () => {
      before(() => {
        process.env.GCLOUD_PROJECT = 'project1';
      });

      after(() => {
        delete process.env.GCLOUD_PROJECT;
      });

      it('should return a TriggerDefinition with appropriate values', () => {
        const func = testLab.testMatrix().onComplete(() => null);
        expect(func.__trigger).to.deep.equal({
          eventTrigger: {
            service: 'testing.googleapis.com',
            eventType: 'google.testing.testMatrix.complete',
            resource: 'projects/project1/testMatrices/{matrix}',
          },
        });
      });

      it('should parse TestMatrix in "INVALID" state', () => {
        const event = {
          data: {
            clientInfo: {
              name: 'test',
            },
            invalidMatrixDetails: 'INVALID_INPUT_APK',
            resultStorage: {
              googleCloudStorage: {
                gcsPath: 'gs://test.appspot.com',
              },
            },
            state: 'INVALID',
            testMatrixId: 'matrix-375mfeu9mnw8t',
            timestamp: '2019-04-15T17:43:32.538Z',
          },
          context: {
            resource: {},
          },
        };
        const expected = <testLab.TestMatrix>{
          testMatrixId: 'matrix-375mfeu9mnw8t',
          state: 'INVALID',
          createTime: '2019-04-15T17:43:32.538Z',
          outcomeSummary: undefined,
          invalidMatrixDetails: 'INVALID_INPUT_APK',
          resultStorage: <testLab.ResultStorage>{
            gcsPath: 'gs://test.appspot.com',
            resultsUrl: undefined,
            toolResultsHistoryId: undefined,
            toolResultsExecutionId: undefined,
          },
          clientInfo: <testLab.ClientInfo>{
            name: 'test',
            details: {},
          },
        };
        const func = testLab.testMatrix().onComplete((matrix) => matrix);
        return expect(func(event.data, event.context)).to.eventually.deep.equal(
          expected
        );
      });

      it('should parse TestMatrix in "FINISHED" state', () => {
        const event = {
          data: {
            clientInfo: {
              name: 'test',
            },
            outcomeSummary: 'FAILURE',
            resultStorage: {
              googleCloudStorage: {
                gcsPath: 'gs://test.appspot.com',
              },
              toolResultsExecution: {
                executionId: '6352915701487950333',
                historyId: 'bh.9b6f4dac24d3049',
                projectId: 'test',
              },
              toolResultsHistory: {
                historyId: 'bh.9b6f4dac24d3049',
                projectId: 'test',
              },
              resultsUrl: 'https://path/to/results',
            },
            state: 'FINISHED',
            testMatrixId: 'matrix-tsgjk8pnvxhya',
            timestamp: '2019-04-15T18:03:11.115Z',
          },
          context: {
            resource: {},
          },
        };
        const expected = <testLab.TestMatrix>{
          testMatrixId: 'matrix-tsgjk8pnvxhya',
          state: 'FINISHED',
          createTime: '2019-04-15T18:03:11.115Z',
          outcomeSummary: 'FAILURE',
          invalidMatrixDetails: undefined,
          resultStorage: <testLab.ResultStorage>{
            gcsPath: 'gs://test.appspot.com',
            toolResultsHistoryId: 'bh.9b6f4dac24d3049',
            toolResultsExecutionId: '6352915701487950333',
            resultsUrl: 'https://path/to/results',
          },
          clientInfo: <testLab.ClientInfo>{
            name: 'test',
            details: {},
          },
        };
        const func = testLab.testMatrix().onComplete((matrix) => matrix);
        return expect(func(event.data, event.context)).to.eventually.deep.equal(
          expected
        );
      });
    });

    describe('process.env.GCLOUD_PROJECT not set', () => {
      it('should not throw if trigger is not accessed', () => {
        expect(() => testLab.testMatrix().onComplete(() => null)).to.not.throw(
          Error
        );
      });

      it('should throw when trigger is accessed', () => {
        expect(
          () => testLab.testMatrix().onComplete(() => null).__trigger
        ).to.throw(Error);
      });
    });
  });

  describe('TestMatrix', () => {
    describe('constructor', () => {
      it('should populate basic fields', () => {
        const expected = <testLab.TestMatrix>{
          testMatrixId: 'id1',
          createTime: '2019-02-08T18:50:32.178Z',
          state: 'FINISHED',
          outcomeSummary: 'SUCCESS',
          invalidMatrixDetails: 'DETAILS_UNAVAILABLE',
          resultStorage: new testLab.ResultStorage(),
          clientInfo: new testLab.ClientInfo(),
        };
        const actual = new testLab.TestMatrix({
          testMatrixId: 'id1',
          timestamp: '2019-02-08T18:50:32.178Z',
          state: 'FINISHED',
          outcomeSummary: 'SUCCESS',
          invalidMatrixDetails: 'DETAILS_UNAVAILABLE',
        });
        expect(actual).to.deep.equal(expected);
      });
    });
  });

  describe('ClientInfo', () => {
    describe('constructor', () => {
      it('should populate basic fields', () => {
        const expected = <testLab.ClientInfo>{
          name: 'client',
          details: {},
        };
        const actual = new testLab.ClientInfo({
          name: 'client',
        });
        expect(actual).to.deep.equal(expected);
      });

      it('should populate key/value details', () => {
        const expected = <testLab.ClientInfo>{
          name: 'client',
          details: {
            k0: 'v0',
            k1: '',
          },
        };
        const actual = new testLab.ClientInfo({
          name: 'client',
          clientInfoDetails: [
            {
              key: 'k0',
              value: 'v0',
            },
            {
              key: 'k1',
            },
          ],
        });
        expect(actual).to.deep.equal(expected);
      });
    });
  });

  describe('ResultStorage', () => {
    describe('constructor', () => {
      it('should populate basic fields', () => {
        const expected = <testLab.ResultStorage>{
          gcsPath: 'path',
          toolResultsHistoryId: 'h1',
          toolResultsExecutionId: 'e2',
          resultsUrl: 'http://example.com/',
        };
        const actual = new testLab.ResultStorage({
          googleCloudStorage: {
            gcsPath: 'path',
          },
          toolResultsHistory: {
            projectId: 'p1',
            historyId: 'h1',
          },
          toolResultsExecution: {
            projectId: 'p2',
            historyId: 'h2',
            executionId: 'e2',
          },
          resultsUrl: 'http://example.com/',
        });
        expect(actual).to.deep.equal(expected);
      });

      it('should not throw on unset fields', () => {
        expect(() => new testLab.ResultStorage({})).to.not.throw();
      });
    });
  });
});
