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
import { apps as appsNamespace } from '../src/apps';

import * as firebase from 'firebase-admin';
import * as _ from 'lodash';
import * as sinon from 'sinon';

describe('apps', () => {
  let apps: appsNamespace.Apps;

  beforeEach(() => {
    apps = new appsNamespace.Apps();
  });

  afterEach(() => {
    _.forEach(firebase.apps, (app) => {
      app.delete();
    });
  });

  describe('retain/release', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    it('should retain/release ref counters appropriately', () => {
      apps.retain();
      expect(_.get(apps, '_refCounter')).to.deep.equal({
        __admin__: 1,
      });
      apps.release();
      clock.tick(appsNamespace.garbageCollectionInterval);
      return Promise.resolve().then(() => {
        expect(_.get(apps, '_refCounter')).to.deep.equal({
          __admin__: 0,
        });
      });
    });

    it('should only decrement counter after garbageCollectionInterval is up', () => {
      apps.retain();
      apps.release();
      clock.tick(appsNamespace.garbageCollectionInterval / 2);
      expect(_.get(apps, '_refCounter')).to.deep.equal({
        __admin__: 1,
      });
      clock.tick(appsNamespace.garbageCollectionInterval / 2);
      return Promise.resolve().then(() => {
        expect(_.get(apps, '_refCounter')).to.deep.equal({
          __admin__: 0,
        });
      });
    });

    it('should call _destroyApp if app no longer used', () => {
      const spy = sinon.spy(apps, '_destroyApp');
      apps.retain();
      apps.release();
      clock.tick(appsNamespace.garbageCollectionInterval);
      return Promise.resolve().then(() => {
        expect(spy.called).to.be.true;
      });
    });

    it('should not call _destroyApp if app used again while waiting for release', () => {
      const spy = sinon.spy(apps, '_destroyApp');
      apps.retain();
      apps.release();
      clock.tick(appsNamespace.garbageCollectionInterval / 2);
      apps.retain();
      clock.tick(appsNamespace.garbageCollectionInterval / 2);
      return Promise.resolve().then(() => {
        expect(spy.called).to.be.false;
      });
    });

    it('should increment ref counter for each subsequent retain', () => {
      apps.retain();
      expect(_.get(apps, '_refCounter')).to.deep.equal({
        __admin__: 1,
      });
      apps.retain();
      expect(_.get(apps, '_refCounter')).to.deep.equal({
        __admin__: 2,
      });
      apps.retain();
      expect(_.get(apps, '_refCounter')).to.deep.equal({
        __admin__: 3,
      });
    });

    it('should work with staggering sets of retain/release', () => {
      apps.retain();
      apps.release();
      clock.tick(appsNamespace.garbageCollectionInterval / 2);
      apps.retain();
      apps.release();
      clock.tick(appsNamespace.garbageCollectionInterval / 2);
      return Promise.resolve()
        .then(() => {
          // Counters are still 1 due second set of retain/release
          expect(_.get(apps, '_refCounter')).to.deep.equal({
            __admin__: 1,
          });
          clock.tick(appsNamespace.garbageCollectionInterval / 2);
        })
        .then(() => {
          // It's now been a full interval since the second set of retain/release
          expect(_.get(apps, '_refCounter')).to.deep.equal({
            __admin__: 0,
          });
        });
    });
  });
});
