/// <reference path="../../typings/index.d.ts" />

import DatabaseDeltaSnapshot from '../../src/database/delta-snapshot';
import {expect as expect} from 'chai';

describe('DatabaseDeltaSnapshot', () => {
  let subject;
  let populate = (old: any, change: any) => {
    subject = new DatabaseDeltaSnapshot({
      path: '/foo',
      data: old,
      delta: change,
      authToken: null,
      type: 'write'
    });
  };

  describe('#val(): any', () => {
    it('should return child values based on the child path', () => {
      populate({a: {b: 'c'}}, {a: {d: 'e'}});
      expect(subject.child('a').val()).to.deep.equal({b: 'c', d: 'e'});
    });

    it('should return null for children past a leaf', () => {
      populate({a: 23}, {b: 33});
      expect(subject.child('a/b').val()).to.be.null;
      expect(subject.child('b/c').val()).to.be.null;
    });

    it('should return a leaf value', () => {
      populate(null, 23);
      expect(subject.val()).to.eq(23);
      populate({a: 23}, {b: 23, a: null});
      expect(subject.child('b').val()).to.eq(23);
    });
  });

  describe('#child(): DatabaseDeltaSnapshot', () => {
    it('should work with multiple calls', () => {
      populate(null, {a: {b: {c: 'd'}}});
      expect(subject.child('a').child('b/c').val()).to.equal('d');
    });
  });

  describe('#exists(): boolean', () => {
    it('should be true for an object value', () => {
      populate(null, {a: {b: 'c'}});
      expect(subject.child('a').exists()).to.be.true;
    });

    it('should be true for a leaf value', () => {
      populate(null, {a: {b: 'c'}});
      expect(subject.child('a/b').exists()).to.be.true;
    });

    it('should be false for a non-existent value', () => {
      populate(null, {a: {b: 'c'}});
      expect(subject.child('d').exists()).to.be.false;
    });

    it('should be false for a value pathed beyond a leaf', () => {
      populate(null, {a: {b: 'c'}});
      expect(subject.child('a/b/c').exists()).to.be.false;
    });
  });

  describe('#previous: DatabaseDeltaSnapshot', () => {
    it('should cause val() to return old data only', () => {
      populate({a: 'b'}, {a: 'c', d: 'c'});
      expect(subject.previous.child('a').val()).to.equal('b');
    });

    it('should return a null if the new value is present', () => {
      populate(null, 23);
      expect(subject.previous.val()).to.be.null;
    });
  });

  describe('#current: DatabaseDeltaSnapshot', () => {
    it('should cause a previous snapshot to return new data', () => {
      populate({a: 'b'}, {a: 'c', d: 'c'});
      expect(subject.previous.child('a').current.val()).to.equal('c');
    });

    it('should return a null if the new value is null', () => {
      populate(23, null);
      expect(subject.previous.current.val()).to.be.null;
    });
  });

  describe('#changed(): boolean', () => {
    it('should be true only when the current value has changed', () => {
      populate({a: {b: 'c'}}, {a: {d: 'e'}});
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
      populate({a: 'b'}, {c: 'd'});
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
      populate(null, {a: 'b', c: 'd'});
      expect(subject.numChildren()).to.eq(2);
    });

    it('should be 0 for non-objects', () => {
      populate(null, 23);
      expect(subject.numChildren()).to.eq(0);
    });
  });

  describe('#hasChild(childPath): boolean', () => {
    it('should return true for a child or deep child', () => {
      populate(null, {a: {b: 'c'}, d: 23});
      expect(subject.hasChild('a/b')).to.be.true;
      expect(subject.hasChild('d')).to.be.true;
    });

    it('should return false if a child is missing', () => {
      populate(null, {a: 'b'});
      expect(subject.hasChild('c')).to.be.false;
      expect(subject.hasChild('a/b')).to.be.false;
    });
  });

  describe('#key: string', () => {
    it('should return the key name', () => {
      expect(subject.key).to.equal('foo');
    });

    it('should return null for the root', () => {
      expect(new DatabaseDeltaSnapshot().key).to.be.null;
    });

    it('should return null for explicit root', () => {
      expect(new DatabaseDeltaSnapshot({
        path: '/',
        data: null,
        delta: {},
        authToken: null,
        type: 'write'
      }).key).to.be.null;
    });

    it('should work for child paths', () => {
      expect(subject.child('foo/bar').key).to.equal('bar');
    });
  });
});
