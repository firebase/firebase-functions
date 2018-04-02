import * as functions from 'firebase-functions';
import * as _ from 'lodash';
import { TestSuite, expectEq } from './testing';

export const callableTests: any = functions.https.onCall(d => {
  return new TestSuite('https onCall')
    .it('should have the correct data', data => expectEq(_.get(data, 'foo'), 'bar'))
    .run(d.testId, d);
});
