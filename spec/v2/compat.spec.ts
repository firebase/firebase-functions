import { expect } from "chai";
import { CloudEvent } from "../../src/v2/core";
import { addV1Compat } from "../../src/v2/compat";

describe("addV1Compat", () => {
  const pubsubEventType = "google.cloud.pubsub.topic.v1.messagePublished";
  const source = "//pubsub.googleapis.com/projects/aProject/topics/topic";

  it("should add V1 compat properties to an event via getters", () => {
    const rawEvent: CloudEvent<any> = {
      specversion: "1.0",
      source,
      id: "event-id-456",
      type: pubsubEventType,
      time: new Date().toISOString(),
      data: {},
    };

    let calledMessage = false;
    let calledContext = false;

    const patchedEvent = addV1Compat(rawEvent, {
      message: () => {
        calledMessage = true;
        return "v1MessageOut";
      },
      context: () => {
        calledContext = true;
        return "v1ContextOut";
      },
    });

    // Check we get the values
    expect(patchedEvent.message).to.equal("v1MessageOut");
    expect(calledMessage).to.be.true;

    expect(patchedEvent.context).to.equal("v1ContextOut");
    expect(calledContext).to.be.true;
  });

  it("should be idempotent and not re-bind getters", () => {
    const rawEvent: CloudEvent<any> = {
      specversion: "1.0",
      source,
      id: "event-id-101",
      type: pubsubEventType,
      time: new Date().toISOString(),
      data: {},
    };

    const patchedOnce = addV1Compat(rawEvent, {
      foo: () => "bar",
    });

    // Attempting to patch again with new getters should just return the already-patched object
    const patchedTwice = addV1Compat(patchedOnce, {
      foo: () => "baz",
      other: () => "thing",
    });

    expect(patchedTwice).to.equal(patchedOnce); // Expect the same object reference due to idempotency
    expect(patchedTwice.foo).to.equal("bar"); // Keeps the old getter
    expect(patchedTwice.other).to.be.undefined;
  });
});
