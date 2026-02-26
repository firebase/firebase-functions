import { expect } from "chai";
import { CloudEvent } from "../../src/v2/core";
import { patchV1Compat, PubSubCloudEvent } from "../../src/v2/compat";
import { MessagePublishedData, Message, messagePublishedEvent } from "../../src/v2/providers/pubsub";
import { finalizedEvent, StorageObjectData } from "../../src/v2/providers/storage";

interface TestData {
  foo: string;
}

describe("patchV1Compat", () => {
  const pubsubEventType = messagePublishedEvent;
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

  it("should return stable references from getV1Compat (memoization)", () => {
    const rawEvent = {
      specversion: "1.0",
      source,
      id: "event-id-stable",
      type: pubsubEventType,
      time: new Date().toISOString(),
      data: {
        message: new Message({
          messageId: "1",
          data: "base64",
          publishTime: "2023-01-01T00:00:00.000Z"
        })
      },
    } as CloudEvent<MessagePublishedData<any>>;

    const patched = patchV1Compat(rawEvent);
    const ref1 = patched.getV1Compat();
    const ref2 = patched.getV1Compat();

    expect(ref1).to.equal(ref2);
  });

  it("should return stable references from getV1Compat for Storage", () => {
    const rawEvent: CloudEvent<StorageObjectData> = {
      specversion: "1.0",
      source: "//storage.googleapis.com/projects/_/buckets/my-bucket/objects/my-object",
      id: "event-id-stable-storage",
      type: finalizedEvent,
      time: new Date().toISOString(),
      data: {
        bucket: "my-bucket",
        name: "my-object",
        size: 1024,
        timeCreated: new Date(),
        updated: new Date(),
        id: "my-bucket/my-object/1",
        generation: 1,
        metageneration: 1,
        storageClass: "STANDARD",
      },
    };

    const patched = patchV1Compat(rawEvent) as any;
    const ref1 = patched.getV1Compat();
    const ref2 = patched.getV1Compat();

    expect(ref1).to.equal(ref2);
    expect(ref1.object).to.equal(ref1.data);
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
