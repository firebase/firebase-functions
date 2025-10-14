import { expect } from "chai";

import { attachLegacyEventProperties, makeLegacyEventContext } from "../../src/v2/compat";

describe("compat", () => {
  describe("makeLegacyEventContext", () => {
    it("normalizes schemed string resources to service and name", () => {
      const context = makeLegacyEventContext(
        {},
        {
          eventType: "test.event",
          service: "storage.googleapis.com",
          resource: "//pubsub.googleapis.com/projects/a/topics/b",
        }
      );

      expect(context.resource).to.deep.equal({
        service: "pubsub.googleapis.com",
        name: "projects/a/topics/b",
      });
    });

    it("strips duplicated service prefixes from string resources", () => {
      const context = makeLegacyEventContext(
        {},
        {
          eventType: "test.event",
          service: "pubsub.googleapis.com",
          resource: "pubsub.googleapis.com/projects/a/topics/b",
        }
      );

      expect(context.resource).to.deep.equal({
        service: "pubsub.googleapis.com",
        name: "projects/a/topics/b",
      });
    });

    it("passes through structured resources while filling missing service", () => {
      const context = makeLegacyEventContext(
        {},
        {
          eventType: "test.event",
          service: "storage.googleapis.com",
          resource: {
            service: "override.googleapis.com",
            name: "some/resource",
            type: "pubsub_topic",
            labels: { key: "value" },
          },
        }
      );

      expect(context.resource).to.deep.equal({
        service: "override.googleapis.com",
        name: "some/resource",
        type: "pubsub_topic",
        labels: { key: "value" },
      });
    });

    it("derives resource details from the event source when none provided", () => {
      const context = makeLegacyEventContext(
        {
          source: "//firestore.googleapis.com/projects/p/databases/(default)/documents/foo",
        },
        {
          eventType: "test.event",
          service: "firestore.googleapis.com",
        }
      );

      expect(context.resource).to.deep.equal({
        service: "firestore.googleapis.com",
        name: "projects/p/databases/(default)/documents/foo",
      });
    });

    it("passes through provided params unchanged", () => {
      const context = makeLegacyEventContext(
        {},
        {
          eventType: "test.event",
          service: "firestore.googleapis.com",
          params: { docPath: "cities/LA" },
        }
      );

      expect(context.params).to.deep.equal({ docPath: "cities/LA" });
    });
  });

  describe("attachLegacyEventProperties", () => {
    it("should attach a lazy context getter and memoize the result", () => {
      const event = {
        id: "abc",
        time: "2024-01-01T00:00:00.000Z",
        source: "//service/resource/foo",
      } as any;

      attachLegacyEventProperties(event, {
        eventType: "test.event",
        service: "service.googleapis.com",
        params: { foo: "bar" },
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

      attachLegacyEventProperties(
        event,
        {
          eventType: "test.event",
          service: "service.googleapis.com",
        },
        {
          value: () => {
            computeCount++;
            return "computed";
          },
        }
      );

      expect(event.value).to.equal("computed");
      expect(event.value).to.equal("computed");
      expect(computeCount).to.equal(1);
    });
  });
});
