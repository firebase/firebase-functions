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

import * as database from '../../src/providers/database';
import { expect as expect } from 'chai';
import { fakeConfig } from '../support/helpers';
import { apps as appsNamespace } from '../../src/apps';
import { config } from '../../src/index';

describe('DatabaseBuilder', () => {

  before(() => {
    config.singleton = fakeConfig();
    appsNamespace.init(config.singleton);
  });

  after(() => {
    delete appsNamespace.singleton;
    delete config.singleton;
  });

  describe('#onWrite()', () => {
    it('should return "ref.write" as the event type', () => {
      let eventType = database.ref('foo').onWrite(() => null).__trigger.eventTrigger.eventType;
      expect(eventType).to.eq('providers/google.firebase.database/eventTypes/ref.write');
    });

    it('should construct a proper resource path', () => {
      process.env.GCLOUD_PROJECT = 'myProject';
      process.env.DB_NAMESPACE = 'subdomain';
      let resource = database.ref('foo').onWrite(() => null).__trigger.eventTrigger.resource;
      expect(resource).to.eq('projects/_/instances/subdomain/refs/foo');
    });

    it('should return a handler that emits events with a proper DeltaSnapshot', () => {
      let handler = database.ref('/users/{id}').onWrite(event => {
        expect(event.data.val()).to.deep.equal({ foo: 'bar' });
      });

      return handler({
        data: {
          data: null,
          delta: { foo: 'bar' },
        },
        resource: 'projects/_/instances/subdomains/refs/users',
      } as any);
    });

    it('should interpolate params until the server does it', () => {
      let handler = database.ref('/users/{id}').onWrite(event => {
        expect(event.resource).to.equal('projects/_/instances/subdomain/refs/users/aUserId');
      });

      return handler({
        data: {
          data: null,
          delta: 'hello',
        },
        resource: 'projects/_/instances/subdomain/refs/users/{id}',
        params: {
          id: 'aUserId',
        },
      });
    });
  });
});

describe('DeltaSnapshot', () => {
  let subject;
  const apps = new appsNamespace.Apps(fakeConfig());

  let populate = (old: any, change: any) => {
    subject = new database.DeltaSnapshot(
      apps.admin,
      apps.admin,
      old,
      change,
      database.resourceToPath('projects/_/instances/mySubdomain/refs/foo')
    );
  };

  describe('#val(): any', () => {
    it('should return child values based on the child path', () => {
      populate({ a: { b: 'c' } }, { a: { d: 'e' } });
      expect(subject.child('a').val()).to.deep.equal({ b: 'c', d: 'e' });
    });

    it('should return null for children past a leaf', () => {
      populate({ a: 23 }, { b: 33 });
      expect(subject.child('a/b').val()).to.be.null;
      expect(subject.child('b/c').val()).to.be.null;
    });

    it('should return a leaf value', () => {
      populate(null, 23);
      expect(subject.val()).to.eq(23);
      populate({ a: 23 }, { b: 23, a: null });
      expect(subject.child('b').val()).to.eq(23);
    });

    it('should coerce object into array if all keys are integers', () => {
      populate(null, { 0: 'a', 1: 'b', 2: { c: 'd' } });
      expect(subject.val()).to.deep.equal(['a', 'b', { c: 'd' }]);
      populate(null, { 0: 'a', 2: 'b', 3: { c: 'd' } });
      expect(subject.val()).to.deep.equal(['a', , 'b', { c: 'd' }]);
      populate(null, { 'foo': { 0: 'a', 1: 'b' } });
      expect(subject.val()).to.deep.equal({ foo: ['a', 'b'] });
    });

    // Regression test: zero-values (including children) were accidentally forwarded as 'null'.
    it('should deal with zero-values appropriately', () => {
      populate(null, 0);
      expect(subject.val()).to.equal(0);
      populate(null, { myKey: 0 });
      expect(subject.val()).to.deep.equal({ myKey: 0 });

      // Null values are still reported as null.
      populate({ myKey: 'foo', myOtherKey: 'bar' }, { myKey: null });
      expect(subject.val()).to.deep.equal({ myOtherKey: 'bar' });
    });
  });

  describe('#child(): DeltaSnapshot', () => {
    it('should work with multiple calls', () => {
      populate(null, { a: { b: { c: 'd' } } });
      expect(subject.child('a').child('b/c').val()).to.equal('d');
    });
  });

  describe('#exists(): boolean', () => {
    it('should be true for an object value', () => {
      populate(null, { a: { b: 'c' } });
      expect(subject.child('a').exists()).to.be.true;
    });

    it('should be true for a leaf value', () => {
      populate(null, { a: { b: 'c' } });
      expect(subject.child('a/b').exists()).to.be.true;
    });

    it('should be false for a non-existent value', () => {
      populate(null, { a: { b: 'c' } });
      expect(subject.child('d').exists()).to.be.false;
    });

    it('should be false for a value pathed beyond a leaf', () => {
      populate(null, { a: { b: 'c' } });
      expect(subject.child('a/b/c').exists()).to.be.false;
    });
  });

  describe('#previous: DeltaSnapshot', () => {
    it('should cause val() to return old data only', () => {
      populate({ a: 'b' }, { a: 'c', d: 'c' });
      expect(subject.previous.child('a').val()).to.equal('b');
    });

    it('should return a null if the new value is present', () => {
      populate(null, 23);
      expect(subject.previous.val()).to.be.null;
    });
  });

  describe('#current: DeltaSnapshot', () => {
    it('should cause a previous snapshot to return new data', () => {
      populate({ a: 'b' }, { a: 'c', d: 'c' });
      expect(subject.previous.child('a').current.val()).to.equal('c');
    });

    it('should return a null if the new value is null', () => {
      populate(23, null);
      expect(subject.previous.current.val()).to.be.null;
    });
  });

  describe('#changed(): boolean', () => {
    it('should be true only when the current value has changed', () => {
      populate({ a: { b: 'c' } }, { a: { d: 'e' } });
      expect(subject.child('a').changed()).to.be.true;
      expect(subject.child('a/b').changed()).to.be.false;
      expect(subject.child('a/d').changed()).to.be.true;
    });

    it('should be true when going to or from a null value', () => {
      populate(null, 'foo');
      expect(subject.changed()).to.be.true;
      populate('foo', null);
      expect(subject.changed()).to.be.true;
    });
  });

  describe('#forEach(childAction: Function)', () => {
    it('should iterate through child snapshots', () => {
      populate({ a: 'b' }, { c: 'd' });
      let out = '';
      subject.forEach(snap => {
        out += snap.val();
      });
      expect(out).to.equal('bd');
    });

    it('should not execute for leaf or null nodes', () => {
      populate(null, 23);
      let count = 0;
      let counter = snap => count++;

      subject.forEach(counter);
      populate(23, null);

      subject.forEach(counter);
      expect(count).to.eq(0);
    });
  });

  describe('#numChildren()', () => {
    it('should be key count for objects', () => {
      populate(null, { a: 'b', c: 'd' });
      expect(subject.numChildren()).to.eq(2);
    });

    it('should be 0 for non-objects', () => {
      populate(null, 23);
      expect(subject.numChildren()).to.eq(0);
    });
  });

  describe('#hasChild(childPath): boolean', () => {
    it('should return true for a child or deep child', () => {
      populate(null, { a: { b: 'c' }, d: 23 });
      expect(subject.hasChild('a/b')).to.be.true;
      expect(subject.hasChild('d')).to.be.true;
    });

    it('should return false if a child is missing', () => {
      populate(null, { a: 'b' });
      expect(subject.hasChild('c')).to.be.false;
      expect(subject.hasChild('a/b')).to.be.false;
    });
  });

  describe('#key: string', () => {
    it('should return the key name', () => {
      expect(subject.key).to.equal('foo');
    });

    it('should return null for the root', () => {
      const snapshot = new database.DeltaSnapshot(
        apps.admin,
        apps.admin,
        null,
        null,
        database.resourceToPath('projects/_/instances/foo/refs')
      );
      expect(snapshot.key).to.be.null;
    });

    it('should return null for explicit root', () => {
      expect(new database.DeltaSnapshot(
        apps.admin,
        apps.admin,
        null,
        {},
        database.resourceToPath('projects/_/instances/foo/refs')
      ).key).to.be.null;
    });

    it('should work for child paths', () => {
      expect(subject.child('foo/bar').key).to.equal('bar');
    });
  });

  describe('#toJSON(): Object', () => {
    it('should return the current value', () => {
      populate(null, { a: 'b' });
      expect(subject.toJSON()).to.deep.equal(subject.val());
      expect(subject.previous.toJSON()).to.deep.equal(subject.previous.val());
    });
    it('should be stringifyable', () => {
      populate(null, { a: 'b' });
      expect(JSON.stringify(subject)).to.deep.equal('{"a":"b"}');
    });
  });
});
