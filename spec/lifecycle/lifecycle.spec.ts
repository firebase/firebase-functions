import { expect } from "chai";
import {
  afterFirstDeploy,
  afterRedeploy,
  clearDeclaredLifecycleHooks,
  declaredLifecycleHooks,
} from "../../src/lifecycle";

describe("lifecycle", () => {
  afterEach(() => {
    clearDeclaredLifecycleHooks();
  });

  describe("afterFirstDeploy", () => {
    it("registers an afterFirstDeploy lifecycle action", () => {
      afterFirstDeploy({
        task: {
          function: "runInitialSetup",
          body: { seedData: true },
        },
      });

      expect(declaredLifecycleHooks.afterFirstDeploy).to.deep.equal({
        task: {
          function: "runInitialSetup",
          body: { seedData: true },
        },
      });
    });

    it("throws an error if afterFirstDeploy is called more than once", () => {
      afterFirstDeploy({ task: { function: "fn1" } });
      expect(() => afterFirstDeploy({ task: { function: "fn2" } })).to.throw(
        "Only one afterFirstDeploy lifecycle hook is allowed per codebase."
      );
    });
  });

  describe("afterRedeploy", () => {
    it("registers an afterRedeploy lifecycle action", () => {
      afterRedeploy({
        call: {
          function: "migrateSchema",
          params: { version: 2 },
        },
      });

      expect(declaredLifecycleHooks.afterRedeploy).to.deep.equal({
        call: {
          function: "migrateSchema",
          params: { version: 2 },
        },
      });
    });

    it("throws an error if afterRedeploy is called more than once", () => {
      afterRedeploy({ call: { function: "fn1" } });
      expect(() => afterRedeploy({ call: { function: "fn2" } })).to.throw(
        "Only one afterRedeploy lifecycle hook is allowed per codebase."
      );
    });
  });
});
