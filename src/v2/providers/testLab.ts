// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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

import { withInit } from "../../common/onInit";
import { initV2Endpoint, ManifestEndpoint } from "../../runtime/manifest";
import { CloudEvent, CloudFunction } from "../core";
import { EventHandlerOptions, getGlobalOptions, optionsToEndpoint } from "../options";
import { wrapTraceContext } from "../trace";

/** @internal */
export const eventType = "google.firebase.testlab.testMatrix.v1.completed";

/** Possible test states for a test matrix. */
export type TestState =
  /** The default value. This value is used if the state is omitted. */
  | "TEST_STATE_UNSPECIFIED"

  /** The test matrix is being validated. */
  | "VALIDATING"

  /** The test matrix is waiting for resources to become available. */
  | "PENDING"

  /** The test matrix has completed normally. */
  | "FINISHED"

  /** The test matrix has completed because of an infrastructure failure. */
  | "ERROR"

  /** The test matrix was not run because the provided inputs are not valid. */
  | "INVALID";

/** Outcome summary for a finished test matrix. */
export type OutcomeSummary =
  /** The default value. This value is used if the state is omitted. */
  | "OUTCOME_SUMMARY_UNSPECIFIED"

  /**
   * The test matrix run was successful, for instance:
   * - All test cases passed.
   * - No crash of the application under test was detected.
   */
  | "SUCCESS"

  /**
   * A run failed, for instance:
   * - One or more test case failed.
   * - A test timed out.
   * - The application under test crashed.
   */
  | "FAILURE"

  /**
   * Something unexpected happened. The test run should still be considered
   * unsuccessful but this is likely a transient problem and re-running the
   * test might be successful.
   */
  | "INCONCLUSIVE"

  /** All tests were skipped. */
  | "SKIPPED";

/** Locations where test results are stored. */
export interface ResultStorage {
  /**
   * Tool Results history resource containing test results. Format is
   * `projects/{project_id}/histories/{history_id}`.
   * See https://firebase.google.com/docs/test-lab/reference/toolresults/rest
   * for more information.
   */
  toolResultsHistory: string;

  /**
   * Tool Results execution resource containing test results. Format is
   * `projects/{project_id}/histories/{history_id}/executions/{execution_id}`.
   * Optional, can be omitted in erroneous test states.
   * See https://firebase.google.com/docs/test-lab/reference/toolresults/rest
   * for more information.
   */
  toolResultsExecution: string;

  /** URI to the test results in the Firebase Web Console. */
  resultsUri: string;

  /**
   * Location in Google Cloud Storage where test results are written to.
   * In the form "gs://bucket/path/to/somewhere".
   */
  gcsPath: string;
}

/** Information about the client which invoked the test. */
export interface ClientInfo {
  /** Client name, such as "gcloud". */
  client: string;

  /** Map of detailed information about the client. */
  details: Record<string, string>;
}

/** The data within all Firebase test matrix completed events. */
export interface TestMatrixCompletedData {
  /** Time the test matrix was created. */
  createTime: string;

  /** State of the test matrix. */
  state: TestState;

  /**
   * Code that describes why the test matrix is considered invalid. Only set for
   * matrices in the INVALID state.
   */
  invalidMatrixDetails: string;

  /** Outcome summary of the test matrix. */
  outcomeSummary: OutcomeSummary;

  /** Locations where test results are stored. */
  resultStorage: ResultStorage;

  /** Information provided by the client that created the test matrix. */
  clientInfo: ClientInfo;

  /** ID of the test matrix this event belongs to. */
  testMatrixId: string;
}

/**
 * Event handler which triggers when a Firebase test matrix completes.
 *
 * @param handler - Event handler which is run every time a Firebase test matrix completes.
 * @returns A Cloud Function that you can export and deploy.
 * @alpha
 */
export function onTestMatrixCompleted(
  handler: (event: CloudEvent<TestMatrixCompletedData>) => any | Promise<any>
): CloudFunction<CloudEvent<TestMatrixCompletedData>>;

/**
 * Event handler which triggers when a Firebase test matrix completes.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firebase test matrix completes.
 * @returns A Cloud Function that you can export and deploy.
 * @alpha
 */
export function onTestMatrixCompleted(
  opts: EventHandlerOptions,
  handler: (event: CloudEvent<TestMatrixCompletedData>) => any | Promise<any>
): CloudFunction<CloudEvent<TestMatrixCompletedData>>;

/**
 * Event handler which triggers when a Firebase test matrix completes.
 *
 * @param optsOrHandler - Options or an event handler.
 * @param handler - Event handler which is run every time a Firebase test matrix completes.
 * @returns A Cloud Function that you can export and deploy.
 * @alpha
 */
export function onTestMatrixCompleted(
  optsOrHandler:
    | EventHandlerOptions
    | ((event: CloudEvent<TestMatrixCompletedData>) => any | Promise<any>),
  handler?: (event: CloudEvent<TestMatrixCompletedData>) => any | Promise<any>
): CloudFunction<CloudEvent<TestMatrixCompletedData>> {
  if (typeof optsOrHandler === "function") {
    handler = optsOrHandler as (event: CloudEvent<TestMatrixCompletedData>) => any | Promise<any>;
    optsOrHandler = {};
  }

  const baseOpts = optionsToEndpoint(getGlobalOptions());
  const specificOpts = optionsToEndpoint(optsOrHandler);

  const func: any = (raw: CloudEvent<unknown>) => {
    return wrapTraceContext(withInit(handler))(raw as CloudEvent<TestMatrixCompletedData>);
  };
  func.run = handler;

  const ep: ManifestEndpoint = {
    ...initV2Endpoint(getGlobalOptions(), optsOrHandler),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType,
      eventFilters: {},
      retry: !!optsOrHandler.retry,
    },
  };
  func.__endpoint = ep;

  return func;
}
