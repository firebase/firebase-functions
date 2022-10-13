import * as functions from "firebase-functions";
import { REGION } from "../region";
import { expectEq, TestSuite } from "../testing";
import TestMatrix = functions.testLab.TestMatrix;

export const testLabTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .testLab.testMatrix()
  .onComplete((matrix, context) => {
    return new TestSuite<TestMatrix>("test matrix complete")
      .it("should have eventId", (snap, context) => context.eventId)

      .it("should have right eventType", (_, context) =>
        expectEq(context.eventType, "google.testing.testMatrix.complete")
      )

      .it("should be in state 'INVALID'", (matrix) => expectEq(matrix.state, "INVALID"))

      .run(matrix?.clientInfo?.details?.testId, matrix, context);
  });
