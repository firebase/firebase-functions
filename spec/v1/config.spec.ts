// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
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
import * as fs from "fs";
import * as process from "process";
import * as sinon from "sinon";

import { config, resetCache } from "../../src/v1/config";

describe("config()", () => {
  let readFileSync: sinon.SinonStub;
  let cwdStub: sinon.SinonStub;

  before(() => {
    readFileSync = sinon.stub(fs, "readFileSync");
    readFileSync.throws("Unexpected call");
    cwdStub = sinon.stub(process, "cwd");
    cwdStub.returns("/srv");
  });

  after(() => {
    sinon.verifyAndRestore();
  });

  afterEach(() => {
    resetCache();
    delete process.env.FIREBASE_CONFIG;
    delete process.env.CLOUD_RUNTIME_CONFIG;
    delete process.env.K_CONFIGURATION;
  });

  it("will never load in GCFv2", () => {
    const json = JSON.stringify({
      foo: "bar",
      firebase: {},
    });
    readFileSync.withArgs("/srv/.runtimeconfig.json").returns(Buffer.from(json));

    process.env.K_CONFIGURATION = "my-service";
    expect(config).to.throw(Error, /transition to using environment variables/);
  });

  it("loads config values from .runtimeconfig.json", () => {
    const json = JSON.stringify({
      foo: "bar",
      firebase: {},
    });
    readFileSync.withArgs("/srv/.runtimeconfig.json").returns(Buffer.from(json));
    const loaded = config();
    expect(loaded).to.not.have.property("firebase");
    expect(loaded).to.have.property("foo", "bar");
  });
});
