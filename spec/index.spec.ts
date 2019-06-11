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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

import * as nock from 'nock';
nock.disableNetConnect();

import 'mocha';
import { setup } from '../src/index';
import './utils.spec';
import './apps.spec';
import './cloud-functions.spec';
import './config.spec';
import './testing.spec';
import './function-builder.spec';
import './providers/analytics.spec';
import './providers/auth.spec';
import './providers/database.spec';
import './providers/firestore.spec';
import './providers/https.spec';
import './providers/pubsub.spec';
import './providers/remoteConfig.spec';
import './providers/storage.spec';
import './providers/crashlytics.spec';

describe('setup()', () => {
  afterEach(() => {
    delete process.env.FIREBASE_CONFIG;
    delete process.env.CLOUD_RUNTIME_CONFIG;
  });

  it('sets GCLOUD_PROJECT from FIREBASE_CONFIG', () => {
    const testProject = 'test-project';
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId: testProject,
    });
    setup();
    chai.expect(process.env.GCLOUD_PROJECT).to.equal(testProject);
  });

  it('does not set GCLOUD_PROJECT if already defined', () => {
    const existingProject = 'test-project';
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId: 'new-project',
    });
    setup();
    chai.expect(process.env.GCLOUD_PROJECT).to.equal(existingProject);
  });
});
