import { expect } from 'chai';

import * as testing from '../src/testing';

// TODO(rjh): As actual testing methods become available, replace this with actual tests.
describe('testing', () => {
  it('should be accessible through the entrypoint', function () {
    expect(testing.whereAreTheBugs()).to.not.equal('Earth');
  });
});
