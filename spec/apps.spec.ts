// The MIT License (MIT)
//
// Copyright (c) 2015 Firebase
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
import { fakeConfig } from './support/helpers';
import { apps as appsNamespace } from '../src/apps';
import * as firebase from 'firebase-admin';
import * as _ from 'lodash';
import * as sinon from 'sinon';

describe('apps', () => {
  let apps: appsNamespace.Apps;
  let claims;
  beforeEach(() => {
    apps = new appsNamespace.Apps(fakeConfig());
    // mock claims intentionally contains dots, square brackets, and nested paths
    claims = {'token': {'firebase': {'identities':{'google.com':['111']}}}};
  });

  afterEach(() => {
    _.forEach(firebase.apps, app => {
      app.delete();
    });
  });

  it('should load the admin app for admin impersonation', function () {
    expect(apps.forMode({ admin: true })).to.equal(apps.admin);
  });

  it('should load the anonymous app for anonymous impersonation', function () {
    expect(apps.forMode({ admin: false })).to.equal(apps.noauth);
  });

  it('should create a user app for user impersonation', function () {
    const auth = { admin: false, variable: claims };
    const key = apps._appName(auth);
    expect(function () {
      return firebase.app(key);
    }).to.throw(Error);

    const userApp = apps.forMode(auth);
    expect(firebase.app(key)).to.equal(userApp);

    const userAppAgain = apps.forMode(auth);
    expect(userApp).to.equal(userAppAgain);
  });

  it('should retain/release ref counters appropriately without auth', function() {
    apps.retain({});
    expect(apps['_refCounter']).to.deep.equal({
      __admin__: 1,
      __noauth__: 1,
    });
    apps.release({});
    expect(apps['_refCounter']).to.deep.equal({
      __admin__: 0,
      __noauth__: 0,
    });
  });

  it('should retain/release ref counters appropriately with admin auth', function() {
    apps.retain({auth: {admin: true}});
    expect(apps['_refCounter']).to.deep.equal({
      __admin__: 2,
    });
    apps.release({auth: {admin: true}});
    expect(apps['_refCounter']).to.deep.equal({
      __admin__: 0,
    });
  });

  it('should retain/release ref counters appropriately with user auth', function() {
    const payload = {auth: {admin: false, variable: claims}};
    const userAppName = apps._appName(payload.auth);
    apps.retain(payload);
    expect(apps['_refCounter']).to.deep.equal({
      __admin__: 1,
      [userAppName]: 1,
    });
    apps.release(payload);
    expect(apps['_refCounter']).to.deep.equal({
      __admin__: 0,
      [userAppName]: 0,
    });
  });

  describe('#_waitToDestroyApp', () => {
    let clock;
    let noauthApp;
    let deleteNoauth;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      noauthApp = apps.forMode({ admin: false });
      deleteNoauth = noauthApp.delete.bind(noauthApp);
      sinon.spy(noauthApp, 'delete');
    });

    afterEach(() => {
      clock.restore();
      noauthApp.delete.restore();
    });

    it('should delete app after 2 minutes and not earlier', function() {
      apps['_refCounter'] = { '__noauth__': 0 };
      apps._waitToDestroyApp('__noauth__');
      clock.tick(appsNamespace.garbageCollectionInterval - 1);
      expect(noauthApp.delete.called).to.be.false;
      clock.tick(1);

      // Technically the delete happens on the next tick *after* 2 min
      return Promise.resolve().then(() => {
        expect(noauthApp.delete.called).to.be.true;
      });
    });

    it('should exit right away if app was already deleted', function() {
      return deleteNoauth().then(() => {
        let spy = sinon.spy(appsNamespace, 'delay');
        apps._waitToDestroyApp('__noauth__');
        spy.restore();
        expect(spy.called).to.be.false;
      });
    });

    it('should not delete app if it gets deleted while function is waiting', function() {
      apps._waitToDestroyApp('__noauth__');
      deleteNoauth();
      clock.tick(appsNamespace.garbageCollectionInterval);
      return Promise.resolve().then(() => {
        expect(noauthApp.delete.called).to.be.false;
      });
    });

    it('should not delete app if ref count rises above 0', function() {
      apps['_refCounter'] = {
        '__admin__': 0,
        '__noauth__': 1,
      };
      apps._waitToDestroyApp('__noauth__');
      clock.tick(appsNamespace.garbageCollectionInterval);
      return Promise.resolve().then(() => {
        expect(noauthApp.delete.called).to.be.false;
      });
    });
  });
});
