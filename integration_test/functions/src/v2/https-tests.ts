import { onCall } from 'firebase-functions/v2/https';
import { expectEq, TestSuite } from '../testing';

export const callabletests = onCall((req) => {
  return new TestSuite('v2 https onCall')
    .it('should have the correct data', (data: any) =>
      expectEq(data?.foo, 'bar')
    )
    .run(req.data.testId, req.data);
});
