import { expect } from "chai";
import {
  afterInstall,
  afterUpdate,
  clearDeclaredLifecycleHooks,
  declaredLifecycleHooks,
} from "../../src/lifecycle";

describe("lifecycle", () => {
  afterEach(() => {
    clearDeclaredLifecycleHooks();
  });

  describe("afterInstall", () => {
    it("registers an afterInstall lifecycle action", () => {
      afterInstall({
        task: {
          function: "runInitialSetup",
          body: { seedData: true },
        },
      });

      expect(declaredLifecycleHooks.afterInstall).to.deep.equal({
        task: {
          function: "runInitialSetup",
          body: { seedData: true },
        },
      });
    });

    it("throws an error if afterInstall is called more than once", () => {
      afterInstall({ task: { function: "fn1" } });
      expect(() => afterInstall({ task: { function: "fn2" } })).to.throw(
        "Only one afterInstall lifecycle hook is allowed per codebase."
      );
    });
  });

  describe("afterUpdate", () => {
    it("registers an afterUpdate lifecycle action", () => {
      afterUpdate({
        call: {
          function: "migrateSchema",
          params: { version: 2 },
        },
      });

      expect(declaredLifecycleHooks.afterUpdate).to.deep.equal({
        call: {
          function: "migrateSchema",
          params: { version: 2 },
        },
      });
    });

    it("throws an error if afterUpdate is called more than once", () => {
      afterUpdate({ call: { function: "fn1" } });
      expect(() => afterUpdate({ call: { function: "fn2" } })).to.throw(
        "Only one afterUpdate lifecycle hook is allowed per codebase."
      );
    });
  });
});
