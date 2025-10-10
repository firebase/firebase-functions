import { expect } from "chai";

import { decorateLegacyEvent, makeLegacyEventContext } from "../../src/v2/compat";

describe("compat", () => {
  describe("decorateLegacyEvent", () => {
    it("should attach a lazy context getter and memoize the result", () => {
      const event = {
        id: "abc",
        time: "2024-01-01T00:00:00.000Z",
        source: "//service/resource/foo",
      } as any;

      decorateLegacyEvent(event, {
        context: {
          eventType: "test.event",
          service: "service.googleapis.com",
          params: { foo: "bar" },
        },
      });

      const context1 = event.context;
      const context2 = event.context;
      expect(context1).to.equal(context2);
      expect(context1).to.deep.equal(
        makeLegacyEventContext(event, {
          eventType: "test.event",
          service: "service.googleapis.com",
          params: { foo: "bar" },
        })
      );
    });

    it("should attach additional lazy getters", () => {
      const event = {
        id: "abc",
      } as any;
      let computeCount = 0;

      decorateLegacyEvent(event, {
        context: {
          eventType: "test.event",
          service: "service.googleapis.com",
        },
        getters: {
          value: () => {
            computeCount++;
            return "computed";
          },
        },
      });

      expect(event.value).to.equal("computed");
      expect(event.value).to.equal("computed");
      expect(computeCount).to.equal(1);
    });
  });
});
