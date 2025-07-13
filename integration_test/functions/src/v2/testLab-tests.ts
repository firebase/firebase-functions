import { onTestMatrixCompleted } from "firebase-functions/v2/testLab";
import { expectEq, TestSuite } from "../testing";

export const testlabtests = onTestMatrixCompleted((event) => {
  const testId = event.data.testMatrixId || "unknown";

  return new TestSuite("testLab onTestMatrixCompleted")
    .it("should have test matrix id", () => {
      expectEq(typeof event.data.testMatrixId, "string");
    })
    .it("should have create time", () => {
      expectEq(typeof event.data.createTime, "string");
    })
    .it("should have state", () => {
      expectEq(typeof event.data.state, "string");
    })
    .it("should have outcome summary", () => {
      expectEq(typeof event.data.outcomeSummary, "string");
    })
    .it("should have invalid matrix details if failed", () => {
      if (event.data.state === "INVALID") {
        expectEq(typeof event.data.invalidMatrixDetails, "string");
      } else {
        expectEq(event.data.invalidMatrixDetails, undefined);
      }
    })
    .it("should have result storage", () => {
      expectEq(typeof event.data.resultStorage.gcsPath, "string");
    })
    .run(testId, event.data);
});
