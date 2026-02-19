import { expect } from "chai";
import { CloudEvent } from "../../src/v2/core";
import { patchV1Compat, PubSubCloudEvent } from "../../src/v2/compat";
import { MessagePublishedData, Message } from "../../src/v2/providers/pubsub";

interface TestData {
  foo: string;
}

describe("patchV1Compat", () => {
  const pubsubEventType = "google.cloud.pubsub.topic.v1.messagePublished";
  const source = "//pubsub.googleapis.com/projects/aProject/topics/topic";

  it("should add V1 compat properties to a Pub/Sub event", () => {
    const messagePayload: TestData = { foo: "bar" };
    const messageData = {
      messageId: "uuid-123",
      data: Buffer.from(JSON.stringify(messagePayload)).toString("base64"),
      attributes: { attr1: "val1" },
      orderingKey: "order1",
      publishTime: new Date(Date.now()).toISOString(),
    };
    const rawEvent: CloudEvent<MessagePublishedData<TestData>> = {
      specversion: "1.0",
      source,
      id: "event-id-456",
      type: pubsubEventType,
      time: messageData.publishTime,
      data: { message: new Message(messageData), subscription: "sub" },
    };

    const patchedEvent = patchV1Compat(rawEvent);

    // Check types at compile time
    const typedEvent: PubSubCloudEvent<TestData> = patchedEvent;

    expect(typedEvent.context).to.deep.equal({
      eventId: messageData.messageId,
      timestamp: messageData.publishTime,
      eventType: "google.pubsub.topic.publish",
      resource: {
        service: "pubsub.googleapis.com",
        name: "projects/aProject/topics/topic",
      },
      params: {},
    });

    expect(typedEvent.message.data).to.equal(messageData.data);
    expect(typedEvent.message.json).to.deep.equal(messagePayload);
    expect(typedEvent.data.message.data).to.equal(messageData.data); // Direct access to V2 CloudEvent data structure
  });

  it("should be idempotent", () => {
    const messageData = {
      messageId: "uuid-789",
      data: Buffer.from("test").toString("base64"),
      publishTime: new Date(Date.now()).toISOString(),
    };
    const rawEvent: CloudEvent<MessagePublishedData<string>> = {
      specversion: "1.0",
      source,
      id: "event-id-101",
      type: pubsubEventType,
      time: messageData.publishTime,
      data: { message: new Message(messageData), subscription: "sub" },
    };

    const patchedOnce = patchV1Compat(rawEvent);
    const patchedTwice = patchV1Compat(patchedOnce);

    expect(patchedTwice).to.equal(patchedOnce); // Expect the same object reference due to idempotency
    expect(patchedTwice.context.eventId).to.equal(messageData.messageId);
  });

  it("should not modify event for unsupported types", () => {
    const rawEvent: CloudEvent<{ some: string }> = {
      specversion: "1.0",
      source: "//some.other.service",
      id: "event-id-112",
      type: "google.some.other.event.v1.happened",
      time: new Date().toISOString(),
      data: { some: "data" },
    };

    const patchedEvent = patchV1Compat(rawEvent);

    expect(patchedEvent).to.equal(rawEvent);
    expect(patchedEvent).to.not.have.property("context");
    expect(patchedEvent).to.not.have.property("message");
  });

  it("should throw error for malformed Pub/Sub events", () => {
    const rawEvent: CloudEvent<any> = {
      specversion: "1.0",
      source,
      id: "event-id-malformed",
      type: pubsubEventType,
      time: new Date().toISOString(),
      data: {}, // Missing message
    };

    expect(() => patchV1Compat(rawEvent)).to.throw(
      "Malformed Pub/Sub event: missing 'message' property."
    );
  });
});
