import { expect } from 'chai';
import { FakeEnv } from './support/helpers';
import { apps as appsNamespace, apps } from '../src/apps';
import * as firebase from 'firebase-admin';
import * as _ from 'lodash';
import * as sinon from 'sinon';

describe('apps', () => {
  let apps: appsNamespace.Apps;
  let claims;
  beforeEach(() => {
    apps = new appsNamespace.Apps(new FakeEnv());
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
      clock.tick(100000);
      expect(noauthApp.delete.called).to.be.false;
      clock.tick(20000);
      expect(noauthApp.delete.called).to.be.true;
    });

    it('should exit right away if app was already deleted', function() {
      return deleteNoauth().then(() => {
        apps._waitToDestroyApp('__noauth__').then(() => {
          expect(noauthApp.delete.called).to.be.false;
        });
      });
    });

    it('should not delete app if it gets deleted while function is waiting', function(done) {
      apps._waitToDestroyApp('__noauth__');
      clock.tick(100000);
      deleteNoauth();
      clock.tick(20000);
      expect(noauthApp.delete.called).to.be.false;
      done();
    });

    it('should not delete app if ref count rises above 0', function() {
      apps['_refCounter'] = {
        '__admin__': 0,
        '__noauth__': 1,
      };
      apps._waitToDestroyApp('__noauth__');
      clock.tick(120000);
      expect(noauthApp.delete.called).to.be.false;
    });
  });
});
