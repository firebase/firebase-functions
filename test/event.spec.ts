import { FirebaseEvent } from '../src/event';
import { expect } from 'chai';
import { FakeEnv } from './support/helpers';
import Apps from '../src/apps';

describe('FirebaseEvent<T>', () => {
  const env = new FakeEnv();
  const apps = new Apps(env);

  it('can be constructed with a minimal payload', () => {
    const event = new FirebaseEvent(apps, {
      action: 'sources/firebase.database/actions/write',
      resource: 'projects/project1',
      path: '/path',
    }, undefined);
    expect(event.action).to.equal('sources/firebase.database/actions/write');
    expect(event.resource).to.equal('projects/project1');
    expect(event.path).to.equal('/path');
    expect(event.app).to.equal(event['_apps'].noauth);
    expect(event.uid).to.be.undefined;
    expect(event.data).to.be.undefined;
  });

  it('can be constructed with an admin auth payload', () => {
    const event = new FirebaseEvent(apps, {
      action: 'sources/firebase.database/actions/write',
      resource: 'projects/project1',
      path: '/path',
      auth: {
        admin: true,
      },
    }, undefined);
    expect(event.action).to.equal('sources/firebase.database/actions/write');
    expect(event.resource).to.equal('projects/project1');
    expect(event.path).to.equal('/path');
    expect(event.app).to.equal(event['_apps'].admin);
    expect(event.uid).to.be.undefined;
    expect(event.data).to.be.undefined;
  });

  it('can be constructed with an explicit anonymous auth payload', () => {
    [undefined, { admin: false }].forEach(function (auth) {
      const event = new FirebaseEvent<Number>(apps, {
        action: 'sources/firebase.database/actions/write',
        resource: 'projects/project1',
        path: '/path',
        auth: auth,
      }, undefined);
      expect(event.action).to.equal('sources/firebase.database/actions/write');
      expect(event.resource).to.equal('projects/project1');
      expect(event.path).to.equal('/path');
      expect(event.app).to.equal(event['_apps'].noauth);
      expect(event.uid).to.be.undefined;
      expect(event.data).to.be.undefined;
    });
  });

  it('can be constructed with user authentication', () => {
    const user = { uid: 42, name: 'inlined' };
    [
      { variable: user },
      {
        admin: false,
        variable: user,
      },
    ].forEach(function (auth) {
      const event = new FirebaseEvent<Number>(apps, {
        action: 'sources/firebase.database/actions/write',
        resource: 'projects/project1',
        path: '/path',
        auth: <any>auth,
      }, undefined);
      expect(event.action).to.equal('sources/firebase.database/actions/write');
      expect(event.resource).to.equal('projects/project1');
      expect(event.path).to.equal('/path');
      expect(event.app).to.deep.equal(event['_apps'].forMode(<any>auth));
      expect(event.uid).to.equal(user.uid);
      expect(event.data).to.be.undefined;
    });
  });

  it('exposes optional forwarded params', () => {
    const event = new FirebaseEvent<Number>(apps, {
      action: 'sources/firebase.database/actions/write',
      resource: 'projects/project1',
      path: '/path',
      params: { param: 'value' },
    }, 42);
    expect(event.data).to.equal(42);
    expect(event.params).to.deep.equal({ param: 'value' });
  });
});
