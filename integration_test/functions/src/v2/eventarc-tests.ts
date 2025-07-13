import { onCustomEventPublished } from "firebase-functions/v2/eventarc";
import { expectEq, TestSuite } from "../testing";

export const eventarctests = onCustomEventPublished("test.v2.custom.event", (event) => {
  const testId = event.data?.testId || "unknown";

  return new TestSuite("eventarc onCustomEventPublished")
    .it("should have event type", () => {
      expectEq(event.type, "test.v2.custom.event");
    })
    .it("should have event id", () => {
      expectEq(typeof event.id, "string");
    })
    .it("should have event source", () => {
      expectEq(typeof event.source, "string");
    })
    .it("should have event time", () => {
      expectEq(typeof event.time, "string");
    })
    .it("should have event data", () => {
      expectEq(event.data?.message, "Hello from Eventarc");
    })
    .it("should have custom attributes", () => {
      expectEq(event.data?.customAttribute, "customValue");
    })
    .run(testId, event);
});

export const eventarctestsWithFilter = onCustomEventPublished(
  {
    eventType: "test.v2.filtered.event",
    channel: "locations/us-central1/channels/firebase",
    filters: {
      attribute1: "value1",
    },
  },
  (event) => {
    const testId = event.data?.testId || "unknown";

    return new TestSuite("eventarc onCustomEventPublished with filters")
      .it("should have matching event type", () => {
        expectEq(event.type, "test.v2.filtered.event");
      })
      .it("should have filtered attribute", () => {
        expectEq(event.data?.attribute1, "value1");
      })
      .it("should have channel data", () => {
        expectEq(typeof event.source, "string");
      })
      .run(testId, event);
  }
);
