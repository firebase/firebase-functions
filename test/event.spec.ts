import FirebaseEvent from '../src/event';
import { expect } from 'chai';
import { FakeEnv } from './support/helpers';

describe('FirebaseEvent<T>', () => {
  it('can be constructed with a minimal payload', () => {
    const event = new FirebaseEvent(new FakeEnv(), {
      service: 'firebase.database',
      type: 'write',
    }, undefined);
    expect(event.service).to.equal('firebase.database');
    expect(event.type).to.equal('write');
    expect(event.app).to.equal(event['_apps'].noauth);
    expect(event.uid).to.be.undefined;
    expect(event.data).to.be.undefined;
  });

  it('can be constructed with an admin auth payload', () => {
    const event = new FirebaseEvent(new FakeEnv(), {
      service: 'firebase.database',
      type: 'write',
      auth: {
        admin: true,
      },
    }, undefined);
    expect(event.service).to.equal('firebase.database');
    expect(event.type).to.equal('write');
    expect(event.app).to.equal(event['_apps'].admin);
    expect(event.uid).to.be.undefined;
    expect(event.data).to.be.undefined;
  });

  it('can be constructed with an explicit anonymous auth payload', () => {
    [undefined, { admin: false }].forEach(function (auth) {
      const event = new FirebaseEvent<Number>(new FakeEnv(), {
        service: 'firebase.database',
        type: 'write',
        auth: auth,
      }, undefined);
      expect(event.service).to.equal('firebase.database');
      expect(event.type).to.equal('write');
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
      const event = new FirebaseEvent<Number>(new FakeEnv(), {
        service: 'firebase.database',
        type: 'write',
        auth: <any>auth,
      }, undefined);
      expect(event.service).to.equal('firebase.database');
      expect(event.type).to.equal('write');
      expect(event.app).to.deep.equal(event['_apps'].forMode(<any>auth));
      expect(event.uid).to.equal(user.uid);
      expect(event.data).to.be.undefined;
    });
  });

  it('exposes optional forwarded params', () => {
    const event = new FirebaseEvent<Number>(new FakeEnv(), {
      service: 'firebase.database',
      type: 'write',
      instance: 'instance',
      deviceId: 'deviceId',
      params: { param: 'value' },
    }, 42);
    expect(event.data).to.equal(42);
    expect(event.instance).to.equal('instance');
    expect(event.deviceId).to.equal('deviceId');
    expect(event.params).to.deep.equal({ param: 'value' });
  });
});
