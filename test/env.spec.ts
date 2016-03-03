/// <reference path="../typings/main.d.ts" />

import FirebaseEnv from '../src/env';
import {resolve} from 'path';
import {expect} from 'chai';

describe('FirebaseEnv', () => {
  let subject;

  it('should load by walking up the directory tree', () => {
    subject = FirebaseEnv.loadFromDirectory(resolve(__dirname, './fixtures/env/node_modules/firebase-functions'));
    expect(subject.get('firebase.database.secret')).to.equal('123SECRET');
  });
});
