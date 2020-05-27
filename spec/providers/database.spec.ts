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

import { expect } from 'chai';
import { apps as appsNamespace } from '../../src/apps';
import * as functions from '../../src/index';
import * as database from '../../src/providers/database';
import { applyChange } from '../../src/utils';

describe('Database Functions', () => {
  describe('DatabaseBuilder', () => {
    // TODO add tests for building a data or change based on the type of operation

    before(() => {
      process.env.FIREBASE_CONFIG = JSON.stringify({
        databaseURL: 'https://subdomain.apse.firebasedatabase.app',
      });
      appsNamespace.init();
    });

    after(() => {
      delete process.env.FIREBASE_CONFIG;
      delete appsNamespace.singleton;
    });

    it('should allow both region and runtime options to be set', () => {
      const fn = functions
        .region('us-east1')
        .runWith({
          timeoutSeconds: 90,
          memory: '256MB',
        })
        .database.ref('/')
        .onCreate((snap) => snap);

      expect(fn.__trigger.regions).to.deep.equal(['us-east1']);
      expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(fn.__trigger.timeout).to.deep.equal('90s');
    });

    describe('#onWrite()', () => {
      it('should return "ref.write" as the event type', () => {
        const eventType = database.ref('foo').onWrite(() => null).__trigger
          .eventTrigger.eventType;
        expect(eventType).to.eq(
          'providers/google.firebase.database/eventTypes/ref.write'
        );
      });

      it('should construct a proper resource path', () => {
        const resource = database.ref('foo').onWrite(() => null).__trigger
          .eventTrigger.resource;
        expect(resource).to.eq('projects/_/instances/subdomain/refs/foo');
      });

      it('should let developers choose a database instance', () => {
        const func = database
          .instance('custom')
          .ref('foo')
          .onWrite(() => null);
        const resource = func.__trigger.eventTrigger.resource;
        expect(resource).to.eq('projects/_/instances/custom/refs/foo');
      });

      it('should return a handler that emits events with a proper DataSnapshot', () => {
        const event = {
          data: {
            data: null,
            delta: { foo: 'bar' },
          },
          context: {
            eventId: '70172329041928',
            eventType:
              'providers/google.firebase.database/eventTypes/ref.write',
            timestamp: '2018-04-09T07:56:12.975Z',
            resource: 'projects/_/instances/subdomains/refs/users',
          },
        };
        const handler = database
          .ref('/users/{id}')
          .onWrite((change, context) => {
            expect(change.after.val()).to.deep.equal({ foo: 'bar' });
          });

        return handler(event.data, event.context);
      });
    });

    describe('#onCreate()', () => {
      it('should return "ref.create" as the event type', () => {
        const eventType = database.ref('foo').onCreate(() => null).__trigger
          .eventTrigger.eventType;
        expect(eventType).to.eq(
          'providers/google.firebase.database/eventTypes/ref.create'
        );
      });

      it('should construct a proper resource path', () => {
        const resource = database.ref('foo').onCreate(() => null).__trigger
          .eventTrigger.resource;
        expect(resource).to.eq('projects/_/instances/subdomain/refs/foo');
      });

      it('should let developers choose a database instance', () => {
        const func = database
          .instance('custom')
          .ref('foo')
          .onCreate(() => null);
        const resource = func.__trigger.eventTrigger.resource;
        expect(resource).to.eq('projects/_/instances/custom/refs/foo');
      });

      it('should return a handler that emits events with a proper DataSnapshot', () => {
        const event = {
          data: {
            data: null,
            delta: { foo: 'bar' },
          },
          context: {
            eventId: '70172329041928',
            eventType:
              'providers/google.firebase.database/eventTypes/ref.create',
            timestamp: '2018-04-09T07:56:12.975Z',
            resource: 'projects/_/instances/subdomains/refs/users',
          },
        };

        const handler = database
          .ref('/users/{id}')
          .onCreate((data, context) => {
            expect(data.val()).to.deep.equal({ foo: 'bar' });
          });

        return handler(event.data, event.context);
      });
    });

    describe('#onUpdate()', () => {
      it('should return "ref.update" as the event type', () => {
        const eventType = database.ref('foo').onUpdate(() => null).__trigger
          .eventTrigger.eventType;
        expect(eventType).to.eq(
          'providers/google.firebase.database/eventTypes/ref.update'
        );
      });

      it('should construct a proper resource path', () => {
        const resource = database.ref('foo').onUpdate(() => null).__trigger
          .eventTrigger.resource;
        expect(resource).to.eq('projects/_/instances/subdomain/refs/foo');
      });

      it('should let developers choose a database instance', () => {
        const func = database
          .instance('custom')
          .ref('foo')
          .onUpdate(() => null);
        const resource = func.__trigger.eventTrigger.resource;
        expect(resource).to.eq('projects/_/instances/custom/refs/foo');
      });

      it('should return a handler that emits events with a proper DataSnapshot', () => {
        const event = {
          data: {
            data: null,
            delta: { foo: 'bar' },
          },
          context: {
            eventId: '70172329041928',
            eventType:
              'providers/google.firebase.database/eventTypes/ref.update',
            timestamp: '2018-04-09T07:56:12.975Z',
            resource: 'projects/_/instances/subdomains/refs/users',
          },
        };

        const handler = database
          .ref('/users/{id}')
          .onUpdate((change, context) => {
            expect(change.after.val()).to.deep.equal({ foo: 'bar' });
          });

        return handler(event.data, event.context);
      });
    });

    describe('#onDelete()', () => {
      it('should return "ref.delete" as the event type', () => {
        const eventType = database.ref('foo').onDelete(() => null).__trigger
          .eventTrigger.eventType;
        expect(eventType).to.eq(
          'providers/google.firebase.database/eventTypes/ref.delete'
        );
      });

      it('should construct a proper resource path', () => {
        const resource = database.ref('foo').onDelete(() => null).__trigger
          .eventTrigger.resource;
        expect(resource).to.eq('projects/_/instances/subdomain/refs/foo');
      });

      it('should let developers choose a database instance', () => {
        const func = database
          .instance('custom')
          .ref('foo')
          .onDelete(() => null);
        const resource = func.__trigger.eventTrigger.resource;
        expect(resource).to.eq('projects/_/instances/custom/refs/foo');
      });

      it('should return a handler that emits events with a proper DataSnapshot', () => {
        const event = {
          data: {
            data: { foo: 'bar' },
            delta: null,
          },
          context: {
            eventId: '70172329041928',
            eventType:
              'providers/google.firebase.database/eventTypes/ref.delete',
            timestamp: '2018-04-09T07:56:12.975Z',
            resource: 'projects/_/instances/subdomains/refs/users',
          },
        };

        const handler = database
          .ref('/users/{id}')
          .onDelete((data, context) => {
            expect(data.val()).to.deep.equal({ foo: 'bar' });
          });

        return handler(event.data, event.context);
      });
    });
  });

  describe('handler namespace', () => {
    describe('#onWrite()', () => {
      it('correctly sets trigger to {}', () => {
        const cf = functions.handler.database.ref.onWrite(() => null);
        expect(cf.__trigger).to.deep.equal({});
      });

      it('should be able to use the instance entry point', () => {
        const func = functions.handler.database.instance.ref.onWrite(
          () => null
        );
        expect(func.__trigger).to.deep.equal({});
      });

      it('should return a handler that emits events with a proper DataSnapshot', () => {
        const event = {
          data: {
            data: null,
            delta: { foo: 'bar' },
          },
          context: {
            eventId: '70172329041928',
            eventType:
              'providers/google.firebase.database/eventTypes/ref.write',
            timestamp: '2018-04-09T07:56:12.975Z',
            resource: 'projects/_/instances/subdomains/refs/users',
          },
        };

        const handler = functions.handler.database.ref.onWrite(
          (change, context) => {
            return expect(change.after.val()).to.deep.equal({ foo: 'bar' });
          }
        );

        return handler(event.data, event.context);
      });
    });

    describe('#onCreate()', () => {
      it('correctly sets trigger to {}', () => {
        const cf = functions.handler.database.ref.onCreate(() => null);
        return expect(cf.__trigger).to.deep.equal({});
      });

      it('should be able to use the instance entry point', () => {
        const func = functions.handler.database.instance.ref.onCreate(
          () => null
        );
        expect(func.__trigger).to.deep.equal({});
      });

      it('should return a handler that emits events with a proper DataSnapshot', () => {
        const event = {
          data: {
            data: null,
            delta: { foo: 'bar' },
          },
          context: {
            eventId: '70172329041928',
            eventType:
              'providers/google.firebase.database/eventTypes/ref.create',
            timestamp: '2018-04-09T07:56:12.975Z',
            resource: 'projects/_/instances/subdomains/refs/users',
          },
        };
        const handler = functions.handler.database.ref.onCreate(
          (data, context) => {
            return expect(data.val()).to.deep.equal({ foo: 'bar' });
          }
        );

        return handler(event.data, event.context);
      });
    });

    describe('#onUpdate()', () => {
      it('correctly sets trigger to {}', () => {
        const cf = functions.handler.database.ref.onUpdate(() => null);
        return expect(cf.__trigger).to.deep.equal({});
      });

      it('should be able to use the instance entry point', () => {
        const func = functions.handler.database.instance.ref.onUpdate(
          () => null
        );
        expect(func.__trigger).to.deep.equal({});
      });

      it('should return a handler that emits events with a proper DataSnapshot', () => {
        const event = {
          data: {
            data: null,
            delta: { foo: 'bar' },
          },
          context: {
            eventId: '70172329041928',
            eventType:
              'providers/google.firebase.database/eventTypes/ref.update',
            timestamp: '2018-04-09T07:56:12.975Z',
            resource: 'projects/_/instances/subdomains/refs/users',
          },
        };
        const handler = functions.handler.database.ref.onUpdate(
          (change, context) => {
            return expect(change.after.val()).to.deep.equal({ foo: 'bar' });
          }
        );

        return handler(event.data, event.context);
      });
    });

    describe('#onDelete()', () => {
      it('correctly sets trigger to {}', () => {
        const cf = functions.handler.database.ref.onDelete(() => null);
        return expect(cf.__trigger).to.deep.equal({});
      });

      it('should be able to use the instance entry point', () => {
        const func = functions.handler.database.instance.ref.onDelete(
          () => null
        );
        expect(func.__trigger).to.deep.equal({});
      });

      it('should return a handler that emits events with a proper DataSnapshot', () => {
        const event = {
          data: {
            data: { foo: 'bar' },
            delta: null,
          },
          context: {
            eventId: '70172329041928',
            eventType:
              'providers/google.firebase.database/eventTypes/ref.delete',
            timestamp: '2018-04-09T07:56:12.975Z',
            resource: 'projects/_/instances/subdomains/refs/users',
          },
        };

        const handler = functions.handler.database.ref.onDelete(
          (data, context) => {
            return expect(data.val()).to.deep.equal({ foo: 'bar' });
          }
        );

        return handler(event.data, event.context);
      });
    });
  });

  describe('process.env.FIREBASE_CONFIG not set', () => {
    it('should not throw if __trigger is not accessed', () => {
      expect(() => database.ref('/path').onWrite(() => null)).to.not.throw(
        Error
      );
    });

    it('should throw when trigger is accessed', () => {
      expect(
        () => database.ref('/path').onWrite(() => null).__trigger
      ).to.throw(Error);
    });

    it('should not throw when #run is called', () => {
      const cf = database.ref('/path').onWrite(() => null);
      expect(cf.run).to.not.throw(Error);
    });
  });

  describe('extractInstanceAndPath', () => {
    it('should return correct us-central prod instance and path strings if domain is missing', () => {
      const [instance, path] = database.extractInstanceAndPath(
        'projects/_/instances/foo/refs/bar',
        undefined
      );
      expect(instance).to.equal('https://foo.firebaseio.com');
      expect(path).to.equal('/bar');
    });

    it('should return the correct staging instance and path strings if domain is present', () => {
      const [instance, path] = database.extractInstanceAndPath(
        'projects/_/instances/foo/refs/bar',
        'firebaseio-staging.com'
      );
      expect(instance).to.equal('https://foo.firebaseio-staging.com');
      expect(path).to.equal('/bar');
    });

    it('should return the correct multi-region instance and path strings if domain is present', () => {
      const [instance, path] = database.extractInstanceAndPath(
        'projects/_/instances/foo/refs/bar',
        'euw1.firebasedatabase.app'
      );
      expect(instance).to.equal('https://foo.euw1.firebasedatabase.app');
      expect(path).to.equal('/bar');
    });

    it('should throw an error if the given instance name contains anything except alphanumerics and dashes', () => {
      expect(() => {
        return database.extractInstanceAndPath(
          'projects/_/instances/a.bad.name/refs/bar',
          undefined
        );
      }).to.throw(Error);
      expect(() => {
        return database.extractInstanceAndPath(
          'projects/_/instances/a_different_bad_name/refs/bar',
          undefined
        );
      }).to.throw(Error);
      expect(() => {
        return database.extractInstanceAndPath(
          'projects/_/instances/BAD!!!!/refs/bar',
          undefined
        );
      }).to.throw(Error);
    });
  });

  describe('DataSnapshot', () => {
    let subject: any;
    const apps = new appsNamespace.Apps();

    const populate = (data: any) => {
      const [instance, path] = database.extractInstanceAndPath(
        'projects/_/instances/other-subdomain/refs/foo',
        'firebaseio-staging.com'
      );
      subject = new database.DataSnapshot(data, path, apps.admin, instance);
    };

    describe('#ref: firebase.database.Reference', () => {
      it('should return a ref for correct instance, not the default instance', () => {
        populate({});
        expect(subject.ref.toJSON()).to.equal(
          'https://other-subdomain.firebaseio-staging.com/foo'
        );
      });
    });

    describe('#val(): any', () => {
      it('should return child values based on the child path', () => {
        populate(applyChange({ a: { b: 'c' } }, { a: { d: 'e' } }));
        expect(subject.child('a').val()).to.deep.equal({ b: 'c', d: 'e' });
      });

      it('should return null for children past a leaf', () => {
        populate(applyChange({ a: 23 }, { b: 33 }));
        expect(subject.child('a/b').val()).to.be.null;
        expect(subject.child('b/c').val()).to.be.null;
      });

      it('should return a leaf value', () => {
        populate(23);
        expect(subject.val()).to.eq(23);
        populate({ b: 23, a: null });
        expect(subject.child('b').val()).to.eq(23);
      });

      it('should coerce object into array if all keys are integers', () => {
        populate({ 0: 'a', 1: 'b', 2: { c: 'd' } });
        expect(subject.val()).to.deep.equal(['a', 'b', { c: 'd' }]);
        populate({ 0: 'a', 2: 'b', 3: { c: 'd' } });
        expect(subject.val()).to.deep.equal(['a', , 'b', { c: 'd' }]);
        populate({ foo: { 0: 'a', 1: 'b' } });
        expect(subject.val()).to.deep.equal({ foo: ['a', 'b'] });
      });

      // Regression test: zero-values (including children) were accidentally forwarded as 'null'.
      it('should deal with zero-values appropriately', () => {
        populate(0);
        expect(subject.val()).to.equal(0);
        populate({ myKey: 0 });
        expect(subject.val()).to.deep.equal({ myKey: 0 });

        // Null values are still reported as null.
        populate({ myKey: null });
        expect(subject.val()).to.deep.equal({ myKey: null });
      });

      // Regression test: .val() was returning array of nulls when there's a property called length (BUG#37683995)
      it('should return correct values when data has "length" property', () => {
        populate({ length: 3, foo: 'bar' });
        expect(subject.val()).to.deep.equal({ length: 3, foo: 'bar' });
      });
    });

    describe('#child(): DataSnapshot', () => {
      it('should work with multiple calls', () => {
        populate({ a: { b: { c: 'd' } } });
        expect(
          subject
            .child('a')
            .child('b/c')
            .val()
        ).to.equal('d');
      });
    });

    describe('#exists(): boolean', () => {
      it('should be true for an object value', () => {
        populate({ a: { b: 'c' } });
        expect(subject.child('a').exists()).to.be.true;
      });

      it('should be true for a leaf value', () => {
        populate({ a: { b: 'c' } });
        expect(subject.child('a/b').exists()).to.be.true;
      });

      it('should be false for a non-existent value', () => {
        populate({ a: { b: 'c' } });
        expect(subject.child('d').exists()).to.be.false;
      });

      it('should be false for a value pathed beyond a leaf', () => {
        populate({ a: { b: 'c' } });
        expect(subject.child('a/b/c').exists()).to.be.false;
      });
    });

    describe('#forEach(action: (a: DataSnapshot) => boolean): boolean', () => {
      it('should iterate through child snapshots', () => {
        populate({ a: 'b', c: 'd' });
        let out = '';
        subject.forEach((snap: any) => {
          out += snap.val();
        });
        expect(out).to.equal('bd');
      });

      it('should have correct key values for child snapshots', () => {
        populate({ a: 'b', c: 'd' });
        let out = '';
        subject.forEach((snap: any) => {
          out += snap.key;
        });
        expect(out).to.equal('ac');
      });

      it('should not execute for leaf or null nodes', () => {
        populate(23);
        let count = 0;
        const counter = (snap: any) => count++;

        expect(subject.forEach(counter)).to.equal(false);
        expect(count).to.eq(0);
      });

      it('should cancel further enumeration if callback returns true', () => {
        populate({ a: 'b', c: 'd', e: 'f', g: 'h' });
        let out = '';
        const ret = subject.forEach((snap: any) => {
          if (snap.val() === 'f') {
            return true;
          }
          out += snap.val();
        });
        expect(out).to.equal('bd');
        expect(ret).to.equal(true);
      });

      it('should not cancel further enumeration if callback returns a truthy value', () => {
        populate({ a: 'b', c: 'd', e: 'f', g: 'h' });
        let out = '';
        const ret = subject.forEach((snap: any) => {
          out += snap.val();
          return 1;
        });
        expect(out).to.equal('bdfh');
        expect(ret).to.equal(false);
      });

      it('should not cancel further enumeration if callback does not return', () => {
        populate({ a: 'b', c: 'd', e: 'f', g: 'h' });
        let out = '';
        const ret = subject.forEach((snap: any) => {
          out += snap.val();
        });
        expect(out).to.equal('bdfh');
        expect(ret).to.equal(false);
      });
    });

    describe('#numChildren()', () => {
      it('should be key count for objects', () => {
        populate({ a: 'b', c: 'd' });
        expect(subject.numChildren()).to.eq(2);
      });

      it('should be 0 for non-objects', () => {
        populate(23);
        expect(subject.numChildren()).to.eq(0);
      });
    });

    describe('#hasChild(childPath): boolean', () => {
      it('should return true for a child or deep child', () => {
        populate({ a: { b: 'c' }, d: 23 });
        expect(subject.hasChild('a/b')).to.be.true;
        expect(subject.hasChild('d')).to.be.true;
      });

      it('should return false if a child is missing', () => {
        populate({ a: 'b' });
        expect(subject.hasChild('c')).to.be.false;
        expect(subject.hasChild('a/b')).to.be.false;
      });
    });

    describe('#key: string', () => {
      it('should return the key name', () => {
        expect(subject.key).to.equal('foo');
      });

      it('should return null for the root', () => {
        const [instance, path] = database.extractInstanceAndPath(
          'projects/_/instances/foo/refs/',
          undefined
        );
        const snapshot = new database.DataSnapshot(
          null,
          path,
          apps.admin,
          instance
        );
        expect(snapshot.key).to.be.null;
      });

      it('should work for child paths', () => {
        expect(subject.child('foo/bar').key).to.equal('bar');
      });
    });

    describe('#toJSON(): Object', () => {
      it('should return the current value', () => {
        populate({ a: 'b' });
        expect(subject.toJSON()).to.deep.equal(subject.val());
      });
      it('should be stringifyable', () => {
        populate({ a: 'b' });
        expect(JSON.stringify(subject)).to.deep.equal('{"a":"b"}');
      });
    });
  });
});
