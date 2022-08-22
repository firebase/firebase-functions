import * as functions from 'firebase-functions';
import { REGION } from '../region';
import { expectEq, TestSuite } from '../testing';

export const callableTests: any = functions
  .runWith({ invoker: 'private' })
  .region(REGION)
  .https.onCall((d) => {
    return new TestSuite('https onCall')
      .it('should have the correct data', (data: any) =>
        expectEq(data?.foo, 'bar')
      )
      .run(d.testId, d);
  });
