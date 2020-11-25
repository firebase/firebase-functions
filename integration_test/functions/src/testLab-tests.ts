import * as functions from 'firebase-functions';
import * as _ from 'lodash';
import { TestSuite, expectEq } from './testing';
import TestMatrix = functions.testLab.TestMatrix;
const REGION = process.env.FIREBASE_FUNCTIONS_TEST_REGION || 'us-central1';

export const testLabTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .testLab.testMatrix()
  .onComplete((matrix, context) => {
    return new TestSuite<TestMatrix>('test matrix complete')
      .it('should have eventId', (snap, context) => context.eventId)

      .it('should have timestamp', (snap, context) => context.timestamp)

      .it('should have right eventType', (_, context) =>
        expectEq(context.eventType, 'google.testing.testMatrix.complete')
      )

      .it("should be in state 'INVALID'", (matrix, _) =>
        expectEq(matrix.state, 'INVALID')
      )

      .run(_.get(matrix, 'clientInfo.details.testId'), matrix, context);
  });
