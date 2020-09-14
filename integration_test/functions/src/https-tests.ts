import * as functions from 'firebase-functions';
import * as _ from 'lodash';
import { expectEq, TestSuite } from './testing';

const REGION = process.env.FIREBASE_FUNCTIONS_TEST_REGION || 'us-central1';

export const callableTests: any = functions.region(REGION).https.onCall((d) => {
  return new TestSuite('https onCall')
    .it('should have the correct data', (data) =>
      expectEq(_.get(data, 'foo'), 'bar')
    )
    .run(d.testId, d);
});
