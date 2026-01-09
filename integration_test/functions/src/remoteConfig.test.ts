import { describe, it, beforeAll, expect } from "vitest";
import { RUN_ID, waitForEvent } from "./utils";
import { expectEventContext, expectCloudEvent } from "./assertions";
import { remoteConfig } from "./firebase.server";

describe("remoteConfig", () => {
  describe("onConfigUpdated", () => {
    let v1Data: any;
    let v2Data: any;

    beforeAll(async () => {
      // Create a shared trigger that only executes once
      let triggerPromise: Promise<void> | null = null;
      const getTrigger = () => {
        if (!triggerPromise) {
          triggerPromise = (async () => {
            const template = await remoteConfig.getTemplate();
            template.version.description = RUN_ID;
            await remoteConfig.validateTemplate(template);
            await remoteConfig.publishTemplate(template);
          })();
        }
        return triggerPromise;
      };

      // Wait for both events in parallel, sharing the same trigger
      [v1Data, v2Data] = await Promise.all([
        waitForEvent("onConfigUpdatedV1", getTrigger),
        waitForEvent("onConfigUpdated", getTrigger),
      ]);
    }, 60_000);

    describe("v1", () => {
      it("should have EventContext", () => {
        expectEventContext(v1Data);
      });

      it("should have the correct data", () => {
        expect(v1Data.update.versionNumber).toBeDefined();
        expect(v1Data.update.updateTime).toBeDefined();
        expect(v1Data.update.updateUser).toBeDefined();
        expect(v1Data.update.description).toBeDefined();
        expect(v1Data.update.description).toBe(RUN_ID);
        expect(v1Data.update.updateOrigin).toBeDefined();
        expect(v1Data.update.updateOrigin).toBe("ADMIN_SDK_NODE");
        expect(v1Data.update.updateType).toBeDefined();
        expect(v1Data.update.updateType).toBe("INCREMENTAL_UPDATE");
        // rollback source optional in v1
      });
    });

    describe("v2", () => {
      it("should be a CloudEvent", () => {
        expectCloudEvent(v2Data);
      });

      it("should have the correct data", () => {
        expect(v2Data.update.versionNumber).toBeDefined();
        expect(v2Data.update.updateTime).toBeDefined();
        expect(v2Data.update.updateUser).toBeDefined();
        expect(v2Data.update.description).toBeDefined();
        expect(v2Data.update.description).toBe(RUN_ID);
        expect(v2Data.update.updateOrigin).toBeDefined();
        expect(v2Data.update.updateOrigin).toBe("ADMIN_SDK_NODE");
        expect(v2Data.update.updateType).toBeDefined();
        expect(v2Data.update.updateType).toBe("INCREMENTAL_UPDATE");
        expect(v2Data.update.rollbackSource).toBeDefined();
      });
    });
  });
});
