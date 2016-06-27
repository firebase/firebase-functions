/// <reference path="../typings/index.d.ts" />

import {expect} from 'chai';
import * as sinon from 'sinon';
import FirebaseEnv from '../src/env';
import {internal} from '../src/internal';
import * as firebase from 'firebase';

describe('internal.apps', () => {
    let stub;
    before(function() {
      // Always return the name of the environment being looked up. Helps debug what possibly causes an explosion.
      stub = sinon.stub(FirebaseEnv.prototype, 'get').returnsArg(0);
    });

    after(function() {
      stub.restore();
    });

    it('should load the admin app for admin impersonation', function() {
        expect(internal.apps.forMode({admin: true})).to.equal(internal.apps.admin);
    });

    it('should load the anonymous app for anonymous impersonation', function() {
        expect(internal.apps.forMode({admin: false})).to.equal(internal.apps.noauth);
    });

    it('should create a user app for user impersonation', function() {
        const claims = {uid: 'inlined', team: 'firebase'};
        const key = JSON.stringify(claims);
        expect(function() {
            return firebase.app(key);
        }).to.throw(Error);

        const userApp = internal.apps.forMode({admin: false, variable: claims});
        expect(firebase.app(key)).to.equal(userApp);

        const userAppAgain = internal.apps.forMode({admin: false, variable: claims});
        expect(userApp).to.equal(userAppAgain);
    });
});
