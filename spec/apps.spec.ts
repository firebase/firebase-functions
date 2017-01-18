import { expect } from 'chai';

import { FakeEnv } from './support/helpers';
import Apps from '../src/apps';
import * as firebase from 'firebase-admin';

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
});
