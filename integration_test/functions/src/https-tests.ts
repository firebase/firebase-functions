import * as functions from 'firebase-functions';
import { TestSuite, expectEq } from './testing';

export const callableTests: any = functions.https.onCall((data, context) => {
  return new TestSuite('https onCall')
    .it('should have the correct data', event => expectEq(event.data.foo, 'bar'))
    .run(data.testId, { data: data, context: context });
});
