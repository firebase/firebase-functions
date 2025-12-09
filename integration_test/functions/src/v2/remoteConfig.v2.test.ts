import { describe, it, beforeAll, expect } from "vitest";
import { RUN_ID, waitForEvent } from "../utils";
import { expectCloudEvent } from "../assertions/identity";
import { remoteConfig } from "../firebase.server";

describe("remoteConfig.v2", () => {
  describe("onConfigUpdated", () => {
    let data: any;

    beforeAll(async () => {
      data = await waitForEvent("onConfigUpdated", async () => {
        const template = await remoteConfig.getTemplate();
        template.version.description = RUN_ID;
        await remoteConfig.validateTemplate(template);
        await remoteConfig.publishTemplate(template);
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should have the correct data", () => {
      expect(data.update.versionNumber).toBeDefined();
      expect(data.update.updateTime).toBeDefined();
      expect(data.update.updateUser).toBeDefined();
      expect(data.update.description).toBeDefined();
      expect(data.update.description).toBe(RUN_ID);
      expect(data.update.updateOrigin).toBeDefined();
      expect(data.update.updateOrigin).toBe("ADMIN_SDK_NODE");
      expect(data.update.updateType).toBeDefined();
      expect(data.update.updateType).toBe("INCREMENTAL_UPDATE");
      expect(data.update.rollbackSource).toBeDefined();
    });
  });
});
