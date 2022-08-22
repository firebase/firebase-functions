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
import Sinon = require("sinon");

import { firebaseConfig, resetCache } from "../../src/common/config";

describe("firebaseConfig()", () => {
  let readFileSync: Sinon.SinonStub;
  let cwdStub: Sinon.SinonStub;

  before(() => {
    readFileSync = Sinon.stub(fs, "readFileSync");
    readFileSync.throws("Unexpected call");
    cwdStub = Sinon.stub(process, "cwd");
    cwdStub.returns("/srv");
  });

  after(() => {
    Sinon.verifyAndRestore();
  });

  afterEach(() => {
    resetCache();

    delete process.env.FIREBASE_CONFIG;
    delete process.env.K_CONFIGURATION;
  });

  it("loads Firebase configs from FIREBASE_CONFIG env variable", () => {
    process.env.FIREBASE_CONFIG = JSON.stringify({
      databaseURL: "foo@firebaseio.com",
    });
    expect(firebaseConfig()).to.have.property("databaseURL", "foo@firebaseio.com");
  });

  it("loads Firebase configs from FIREBASE_CONFIG env variable pointing to a file", () => {
    const oldEnv = process.env;
    (process as any).env = {
      ...oldEnv,
      FIREBASE_CONFIG: ".firebaseconfig.json",
    };
    try {
      readFileSync.returns(Buffer.from('{"databaseURL": "foo@firebaseio.com"}'));
      expect(firebaseConfig()).to.have.property("databaseURL", "foo@firebaseio.com");
    } finally {
      (process as any).env = oldEnv;
    }
  });
});
