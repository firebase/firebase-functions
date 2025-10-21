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

import { expect } from "chai";
import express from "express";

import * as https from "../src/common/providers/https";
import * as tasks from "../src/common/providers/tasks";

/**
 * RunHandlerResult contains the data from an express.Response.
 */
export interface RunHandlerResult {
  status: number;
  headers: { [name: string]: string };
  body: any;
}

/**
 * Runs an express handler with a given request asynchronously and returns the
 * data populated into the response.
 */
export function runHandler(
  handler: express.Handler,
  request: https.Request
): Promise<RunHandlerResult> {
  return new Promise((resolve) => {
    // MockResponse mocks an express.Response.
    // This class lives here so it can reference resolve and reject.
    class MockResponse {
      private sentBody: string | undefined;
      private statusCode = 0;
      private headers: { [name: string]: string } = {};
      private callback: () => void;
      private writeCalled = false;

      constructor() {
        request.on("close", () => this.end());
      }

      public status(code: number) {
        this.statusCode = code;
        return this;
      }

      // Headers are only set by the cors handler.
      public setHeader(name: string, value: string) {
        this.headers[name] = value;
      }

      public getHeader(name: string): string {
        return this.headers[name];
      }

      public send(sendBody: any) {
        if (this.writeCalled) {
          throw Error("Cannot set headers after they are sent to the client");
        }

        const toSend = typeof sendBody === "object" ? JSON.stringify(sendBody) : sendBody;
        const body =
          typeof this.sentBody === "undefined" ? toSend : this.sentBody + String(toSend || "");
        this.end(body);
      }

      public write(writeBody: any, cb?: () => void) {
        this.writeCalled = true;

        if (typeof this.sentBody === "undefined") {
          this.sentBody = writeBody;
        } else {
          this.sentBody += typeof writeBody === "object" ? JSON.stringify(writeBody) : writeBody;
        }
        if (cb) {
          setImmediate(cb);
        }
        return true;
      }

      public end(body?: unknown) {
        if (body) {
          this.write(body);
        }
        resolve({
          status: this.statusCode,
          headers: this.headers,
          body: this.sentBody,
        });

        if (this.callback) {
          this.callback();
        }
      }

      public on(event: string, callback: () => void) {
        if (event !== "finish" && event !== "close") {
          throw new Error("MockResponse only implements close and finish event");
        }
        this.callback = callback;
      }
    }
    const response = new MockResponse();
    handler(request, response as any, () => undefined);
  });
}

export function checkAuthContext(
  context: https.CallableContext | https.CallableRequest | tasks.TaskContext,
  projectId: string,
  userId: string
) {
  expect(context.auth).to.not.be.undefined;
  expect(context.auth).to.not.be.null;
  expect(context.auth.uid).to.equal(userId);
  expect(context.auth.token.uid).to.equal(userId);
  expect(context.auth.token.sub).to.equal(userId);
  expect(context.auth.token.aud).to.equal(projectId);

  // TaskContext & TaskRequest don't have instanceIdToken
  if ({}.hasOwnProperty.call(context, "instanceIdToken")) {
    expect((context as https.CallableContext).instanceIdToken).to.be.undefined;
  }
}

export function checkAppCheckContext(
  context: https.CallableContext | https.CallableRequest,
  projectId: string,
  appId: string
) {
  expect(context.app).to.not.be.undefined;
  expect(context.app).to.not.be.null;
  expect(context.app.appId).to.equal(appId);
  expect(context.app.token.app_id).to.be.equal(appId);
  expect(context.app.token.sub).to.be.equal(appId);
  expect(context.app.token.aud).to.be.deep.equal([`projects/${projectId}`]);
  expect(context.auth).to.be.undefined;
  expect(context.instanceIdToken).to.be.undefined;
}
