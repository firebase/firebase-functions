/// <reference path="../typings/index.d.ts" />

import FirebaseEnv from '../src/env';
import {resolve} from 'path';
import {expect} from 'chai';

describe('FirebaseEnv', () => {
  let subject;

  it('should load from the specific path', () => {
    subject = FirebaseEnv.loadPath(resolve(__dirname, './fixtures/env/env.json'));
    expect(subject.get('firebase.database.secret')).to.equal('123SECRET');
  });
});
