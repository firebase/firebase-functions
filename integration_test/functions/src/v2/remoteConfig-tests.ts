import { onConfigUpdated } from "firebase-functions/v2/remoteConfig";
import { expectEq, TestSuite } from "../testing";

export const remoteconfigtests = onConfigUpdated((event) => {
  const testId = event.data.versionNumber?.toString() || "unknown";

  return new TestSuite("remoteConfig onConfigUpdated")
    .it("should have version number", () => {
      expectEq(typeof event.data.versionNumber, "string");
    })
    .it("should have update time", () => {
      expectEq(typeof event.data.updateTime, "string");
    })
    .it("should have update user", () => {
      expectEq(typeof event.data.updateUser?.email, "string");
    })
    .it("should have update origin", () => {
      expectEq(typeof event.data.updateOrigin, "string");
    })
    .it("should have update type", () => {
      expectEq(typeof event.data.updateType, "string");
    })
    .run(testId, event.data);
});
