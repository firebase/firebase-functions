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
import * as identity from "../../../src/v2/providers/identity";
import * as identityCommon from "../../../src/common/providers/identity";
import * as sinon from 'sinon';
import { expect } from "chai";

describe('identity', () => {
  let createHandlerStub: sinon.SinonStub;

  beforeEach(() => {
    createHandlerStub = sinon.stub(identityCommon, "createV2Handler").returns((req, res) => Promise.resolve());
  });

  afterEach(() => {
    sinon.verifyAndRestore();
  });

  describe('beforeUserCreated', () => {

  });

  describe('beforeUserSignedIn', () => {

  });

  describe('beforeOperation', () => {
    
  });

  describe('getOpts', () => {
    it('should parse an empty object', () => {
      const internalOpts = identity.getOpts({});

      expect(internalOpts).to.deep.equal({
        opts: {},
        accessToken: false,
        idToken: false,
        refreshToken: false,
      });
    });

    it('should parse global options', () => {
      const internalOpts = identity.getOpts({ region: "us-central1", cpu: 2 });

      expect(internalOpts).to.deep.equal({
        opts: {
          region: "us-central1",
          cpu: 2,
        },
        accessToken: false,
        idToken: false,
        refreshToken: false,
      });
    });

    it('should a full options', () => {
      const internalOpts = identity.getOpts({ 
        region: "us-central1",
        cpu: 2,
        accessToken: true,
        idToken: false,
        refreshToken: true,
      });

      expect(internalOpts).to.deep.equal({
        opts: {
          region: "us-central1",
          cpu: 2,
        },
        accessToken: true,
        idToken: false,
        refreshToken: true,
      });
    });
  });
});
