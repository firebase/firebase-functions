import { expect } from 'chai';
import * as sinon from 'sinon';
import { FakeEnv } from './support/helpers';
import Apps from '../src/apps';
import * as firebase from 'firebase';

describe('apps', () => {
  let apps;
  beforeEach(() => {
    apps = new Apps(new FakeEnv());
  });

  it('should load the admin app for admin impersonation', function () {
    expect(apps.forMode({ admin: true })).to.equal(apps.admin);
  });

  it('should load the anonymous app for anonymous impersonation', function () {
    expect(apps.forMode({ admin: false })).to.equal(apps.noauth);
  });

  it('should create a user app for user impersonation', function () {
    const claims = { uid: 'inlined', team: 'firebase' };
    const key = JSON.stringify(claims);
    expect(function () {
      return firebase.app(key);
    }).to.throw(Error);

    const userApp = apps.forMode({ admin: false, variable: claims });
    expect(firebase.app(key)).to.equal(userApp);

    const userAppAgain = apps.forMode({ admin: false, variable: claims });
    expect(userApp).to.equal(userAppAgain);
  });

  it('should retain/release ref counters appropriately without auth', function() {
    apps.retain();
    expect(apps._refCounter).to.deep.equal({
      admin: 1,
      noauth: 1,
      user: {},
    });
    apps.release();
    expect(apps._refCounter).to.deep.equal({
      admin: 0,
      noauth: 0,
      user: {},
    });
  });

  it('should retain/release ref counters appropriately with admin auth', function() {
    apps.retain({auth: {admin: true}});
    expect(apps._refCounter).to.deep.equal({
      admin: 2,
      noauth: 0,
      user: {},
    });
    apps.release({auth: {admin: true}});
    expect(apps._refCounter).to.deep.equal({
      admin: 0,
      noauth: 0,
      user: {},
    });
  });

  it('should retain/release ref counters appropriately with user auth', function() {
    apps.retain({auth: {admin: false, variable: 1111}});
    expect(apps._refCounter).to.deep.equal({
      admin: 1,
      noauth: 0,
      user: {'1111': 1},
    });
    apps.release({auth: {admin: false, variable: 1111}});
    expect(apps._refCounter).to.deep.equal({
      admin: 0,
      noauth: 0,
      user: {'1111': 0},
    });
  });

  it('should trigger app deletion when ref count is 0', function() {
    // overwrite some deletion functions
    // apps.retain();
    // expect deletion functions to be called
  });

  it('waits 2 min before destroying app', function(done) {
    let clock = sinon.useFakeTimers();
    let testApp = firebase.initializeApp(apps.firebaseArgs, 'test');
    let spy = sinon.spy();
    testApp.delete = spy;

    apps._waitToDestroyApp(testApp);
    clock.tick(100000);
    expect(spy.called).to.be.false;
    clock.tick(20000);
    expect(spy.called).to.be.true;

    clock.restore();
    done();
  });

  it('should be able to recreate admin after destruction', function() {
    let getAdmin = () => {
      firebase.app('__admin__');
    };
    let admin = apps.admin;

    return admin.delete().then(() => {
      expect(getAdmin).to.throw(Error);
      expect(apps.admin).to.be.an('object'); // Calling getter creates another app
      expect(getAdmin).to.not.throw(Error);
    });
  });

  it('should be able to recreate noauth after destruction', function() {
    let getNoauth = () => {
      firebase.app('__noauth__');
    };
    let noauth = apps.noauth;

    return noauth.delete().then(() => {
      expect(getNoauth).to.throw(Error);
      expect(apps.noauth).to.be.an('object'); // Calling getter creates another app
      expect(getNoauth).to.not.throw(Error);
    });
  });
});
