import { expect } from "chai";

import { CloudEvent } from "../../../src/v2/core";
import * as options from "../../../src/v2/options";
import * as pubsub from "../../../src/v2/providers/pubsub";
import { defineString } from "../../../src/params";
import { FULL_ENDPOINT, MINIMAL_V2_ENDPOINT, FULL_OPTIONS, FULL_TRIGGER } from "./fixtures";

const EVENT_TRIGGER = {
  eventType: "google.cloud.pubsub.topic.v1.messagePublished",
  resource: "projects/aProject/topics/topic",
};

const ENDPOINT_EVENT_TRIGGER = {
  eventType: "google.cloud.pubsub.topic.v1.messagePublished",
  eventFilters: {
    topic: "topic",
  },
  retry: false,
};

describe("onMessagePublished", () => {
  beforeEach(() => {
    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = "aProject";
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  it("should return a minimal trigger/endpoint with appropriate values", () => {
    const result = pubsub.onMessagePublished("topic", () => 42);

    expect(result.__trigger).to.deep.equal({
      platform: "gcfv2",
      eventTrigger: EVENT_TRIGGER,
      labels: {},
    });

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      eventTrigger: ENDPOINT_EVENT_TRIGGER,
      labels: {},
    });
  });

  it("should create a complex trigger/endpoint with appropriate values", () => {
    const result = pubsub.onMessagePublished({ ...FULL_OPTIONS, topic: "topic" }, () => 42);

    expect(result.__trigger).to.deep.equal({
      ...FULL_TRIGGER,
      eventTrigger: EVENT_TRIGGER,
    });

    expect(result.__endpoint).to.deep.equal({
      ...FULL_ENDPOINT,
      platform: "gcfv2",
      eventTrigger: ENDPOINT_EVENT_TRIGGER,
    });
  });

  it("should merge options and globalOptions", () => {
    options.setGlobalOptions({
      concurrency: 20,
      region: "europe-west1",
      minInstances: 1,
    });

    const result = pubsub.onMessagePublished(
      {
        topic: "topic",
        region: "us-west1",
        minInstances: 3,
      },
      () => 42
    );

    expect(result.__trigger).to.deep.equal({
      platform: "gcfv2",
      concurrency: 20,
      minInstances: 3,
      regions: ["us-west1"],
      labels: {},
      eventTrigger: EVENT_TRIGGER,
    });

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      concurrency: 20,
      minInstances: 3,
      region: ["us-west1"],
      labels: {},
      eventTrigger: ENDPOINT_EVENT_TRIGGER,
    });
  });

  it("should convert retry option if appropriate", () => {
    const result = pubsub.onMessagePublished(
      {
        topic: "topic",
        region: "us-west1",
        minInstances: 3,
        retry: true,
      },
      () => 42
    );

    expect(result.__trigger).to.deep.equal({
      platform: "gcfv2",
      minInstances: 3,
      regions: ["us-west1"],
      labels: {},
      eventTrigger: EVENT_TRIGGER,
      failurePolicy: { retry: true },
    });

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      minInstances: 3,
      region: ["us-west1"],
      labels: {},
      eventTrigger: { ...ENDPOINT_EVENT_TRIGGER, retry: true },
    });
  });

  it("should have a .run method", () => {
    const func = pubsub.onMessagePublished("topic", (event) => event);

    const res = func.run("input" as any);

    expect(res).to.equal("input");
  });

  it("should parse pubsub messages", async () => {
    let json: unknown;
    const messageJSON = {
      messageId: "uuid",
      data: Buffer.from(JSON.stringify({ hello: "world" })).toString("base64"),
      attributes: { key: "value" },
      orderingKey: "orderingKey",
      publishTime: new Date(Date.now()).toISOString(),
    };
    const publishData: pubsub.MessagePublishedData<any> = {
      message: new pubsub.Message(messageJSON) as any,
      subscription: "projects/aProject/subscriptions/aSubscription",
    };
    const event: CloudEvent<pubsub.MessagePublishedData<any>> = {
      specversion: "1.0",
      source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
      id: "uuid",
      type: EVENT_TRIGGER.eventType,
      time: messageJSON.publishTime,
      data: publishData,
    };

    const func = pubsub.onMessagePublished("topic", (event) => {
      json = event.data.message.json;
      return event;
    });

    const eventAgain = await func(event);

    // Deep equal uses JSON equality, so we'll still match even though
    // Message is a class and we passed an interface.
    expect(eventAgain).to.deep.equal(event);

    expect(json).to.deep.equal({ hello: "world" });
  });

  // These tests pass if the transpiler works
  it("allows desirable syntax", () => {
    pubsub.onMessagePublished<string>(
      "topic",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (event: CloudEvent<pubsub.MessagePublishedData<string>>) => undefined
    );
    pubsub.onMessagePublished<string>(
      "topic",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (event: CloudEvent<pubsub.MessagePublishedData>) => undefined
    );
    pubsub.onMessagePublished(
      "topic",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (event: CloudEvent<pubsub.MessagePublishedData<string>>) => undefined
    );
    pubsub.onMessagePublished(
      "topic",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (event: CloudEvent<pubsub.MessagePublishedData>) => undefined
    );
  });

  it("should accept StringParam for topic", () => {
    const topicParam = defineString("TOPIC_NAME");
    const result = pubsub.onMessagePublished(
      {
        topic: topicParam,
      },
      () => 42
    );

    // __endpoint should include topic in eventFilters
    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      eventTrigger: {
        eventType: "google.cloud.pubsub.topic.v1.messagePublished",
        eventFilters: {
          topic: topicParam,
        },
        retry: false,
      },
      labels: {},
    });

    // __trigger should omit resource when topic is an Expression
    // (resource path cannot be determined at definition time)
    const trigger = result.__trigger as any;
    expect(trigger.eventTrigger).to.not.have.property("resource");
    expect(trigger.eventTrigger.eventType).to.equal(
      "google.cloud.pubsub.topic.v1.messagePublished"
    );
  });

  it("should preserve __trigger.resource for string topic", () => {
    const result = pubsub.onMessagePublished(
      {
        topic: "test-topic",
      },
      () => 42
    );

    // __endpoint should include topic in eventFilters
    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      eventTrigger: {
        eventType: "google.cloud.pubsub.topic.v1.messagePublished",
        eventFilters: {
          topic: "test-topic",
        },
        retry: false,
      },
      labels: {},
    });

    const trigger = result.__trigger as any;
    expect(trigger.eventTrigger).to.have.property("resource");
    expect(trigger.eventTrigger.eventType).to.equal(
      "google.cloud.pubsub.topic.v1.messagePublished"
    );
  });

  it("preserves backward compatibility for user tests passing POJOs without v1 getters", async () => {
    // If the function signature expects a V1Compat event, passing a standard v2 CloudEvent
    // should still be accepted by the TypeScript compiler.
    const func = pubsub.onMessagePublished("topic", (event) => {
      return event.data.message.json;
    });

    const vanillaV2Event: CloudEvent<pubsub.MessagePublishedData<any>> = {
      specversion: "1.0",
      source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
      id: "uuid",
      type: EVENT_TRIGGER.eventType,
      time: new Date().toISOString(),
      data: {
        message: new pubsub.Message({
          data: Buffer.from(JSON.stringify({ test: "data" })).toString("base64"),
        }) as any,
        subscription: "sub",
      },
    };

    // This should compile without TS errors regarding missing 'message' or 'context'
    const result = await func.run(vanillaV2Event);
    expect(result).to.deep.equal({ test: "data" });
  });
});

describe("event.data.message wrapping (POJO -> Message instance)", () => {
  const rawMessagePOJO = {
    messageId: "pojo-msg-id",
    data: Buffer.from(JSON.stringify({ regression: "test" })).toString("base64"),
    attributes: { env: "test" },
    orderingKey: "key1",
    publishTime: new Date().toISOString(),
  };

  function makeRawEvent(
    message: any,
    subscription = "projects/aProject/subscriptions/aSub"
  ): CloudEvent<any> {
    return {
      specversion: "1.0",
      source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
      id: "raw-event-id",
      type: EVENT_TRIGGER.eventType,
      time: rawMessagePOJO.publishTime,
      data: { message, subscription },
    };
  }

  it("should convert a raw POJO message into a Message instance on event.data.message", async () => {
    let capturedMessage: any;
    const func = pubsub.onMessagePublished("topic", (event) => {
      capturedMessage = event.data.message;
    });

    // Pass a raw POJO, NOT a Message instance — this is what the runtime delivers
    await func(makeRawEvent({ ...rawMessagePOJO }));

    expect(capturedMessage).to.be.an.instanceOf(pubsub.Message);
  });

  it("should provide a working .json getter on event.data.message when input is a raw POJO", async () => {
    let json: unknown;
    const func = pubsub.onMessagePublished("topic", (event) => {
      json = event.data.message.json;
    });

    await func(makeRawEvent({ ...rawMessagePOJO }));

    expect(json).to.deep.equal({ regression: "test" });
  });

  it("should preserve all Message fields when wrapping a raw POJO", async () => {
    let msg: any;
    const func = pubsub.onMessagePublished("topic", (event) => {
      msg = event.data.message;
    });

    await func(makeRawEvent({ ...rawMessagePOJO }));

    expect(msg.messageId).to.equal("pojo-msg-id");
    expect(msg.data).to.equal(rawMessagePOJO.data);
    expect(msg.attributes).to.deep.equal({ env: "test" });
    expect(msg.orderingKey).to.equal("key1");
    expect(msg.publishTime).to.equal(rawMessagePOJO.publishTime);
  });

  it("should not re-wrap if event.data.message is already a Message instance", async () => {
    const original = new pubsub.Message(rawMessagePOJO);
    let capturedMessage: any;
    const func = pubsub.onMessagePublished("topic", (event) => {
      capturedMessage = event.data.message;
    });

    await func(makeRawEvent(original));

    expect(capturedMessage).to.equal(original); // same reference
    expect(capturedMessage.json).to.deep.equal({ regression: "test" });
  });

  it("should throw on a malformed event without a message property", async () => {
    const func = pubsub.onMessagePublished("topic", () => undefined);
    const badEvent: CloudEvent<any> = {
      specversion: "1.0",
      source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
      id: "bad-event",
      type: EVENT_TRIGGER.eventType,
      time: new Date().toISOString(),
      data: { subscription: "sub" }, // no message!
    };

    try {
      await func(badEvent);
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err.message).to.match(/missing 'message' property/i);
    }
  });

  it("should make event.data.message.json and event.message.json return the same value", async () => {
    let v2Json: unknown;
    let v1Json: unknown;
    const func = pubsub.onMessagePublished("topic", (event) => {
      v2Json = event.data.message.json;
      v1Json = (event as any).message.json;
    });

    await func(makeRawEvent({ ...rawMessagePOJO }));

    expect(v2Json).to.deep.equal({ regression: "test" });
    expect(v1Json).to.deep.equal({ regression: "test" });
  });
});

describe("v1-compatible getters", () => {
  let capturedEvent: any;
  const messageData = {
    messageId: "uuid-123",
    data: Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64"),
    attributes: { attr1: "val1" },
    orderingKey: "order1",
    publishTime: new Date(Date.now()).toISOString(),
  };

  beforeEach(async () => {
    const v2MessageInstance = new pubsub.Message(messageData);
    const publishData: pubsub.MessagePublishedData<any> = {
      message: v2MessageInstance,
      subscription: "projects/aProject/subscriptions/aSubscription",
    };
    const event: CloudEvent<pubsub.MessagePublishedData<any>> = {
      specversion: "1.0",
      source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
      id: "event-id-456",
      type: EVENT_TRIGGER.eventType,
      time: messageData.publishTime,
      data: publishData,
    };

    const func = pubsub.onMessagePublished("topic", (e) => {
      capturedEvent = e;
      return Promise.resolve();
    });

    await func(event);
  });

  it("should provide v1-compatible getters on the event object", () => {
    // Test the context getter
    expect(capturedEvent.context).to.deep.equal({
      eventId: messageData.messageId,
      timestamp: messageData.publishTime,
      eventType: "google.pubsub.topic.publish",
      resource: {
        service: "pubsub.googleapis.com",
        name: "projects/aProject/topics/topic",
      },
      params: {},
    });

    // Test the message getter
    expect(capturedEvent.message).to.be.an("object");
    expect(capturedEvent.message.data).to.equal(messageData.data);
    expect(capturedEvent.message.attributes).to.deep.equal(messageData.attributes);
    expect(capturedEvent.message.messageId).to.equal(messageData.messageId);
    expect(capturedEvent.message.publishTime).to.equal(messageData.publishTime);
    expect(capturedEvent.message.orderingKey).to.equal(messageData.orderingKey);
    expect(capturedEvent.message.json).to.deep.equal({ foo: "bar" });
    expect(capturedEvent.message.toJSON()).to.deep.equal({
      data: messageData.data,
      attributes: messageData.attributes,
      messageId: messageData.messageId,
      publishTime: messageData.publishTime,
      orderingKey: messageData.orderingKey,
    });
  });

  it("should not affect standard v2 event property access", () => {
    // Standard v2 access patterns
    expect(capturedEvent.id).to.equal("event-id-456");
    expect(capturedEvent.source).to.equal("//pubsub.googleapis.com/projects/aProject/topics/topic");
    expect(capturedEvent.data.subscription).to.equal(
      "projects/aProject/subscriptions/aSubscription"
    );
    expect(capturedEvent.data.message.messageId).to.equal("uuid-123");
    expect(capturedEvent.data.message.json).to.deep.equal({ foo: "bar" });
    expect(capturedEvent.data.message.attributes).to.deep.equal({ attr1: "val1" });
  });

  it("should provide an empty object for attributes if missing in the original message", async () => {
    const messageDataNoAttrs = {
      messageId: "uuid-456",
      data: Buffer.from(JSON.stringify({ foo: "baz" })).toString("base64"),
      // attributes property is missing
      publishTime: new Date(Date.now()).toISOString(),
    };
    const v2MessageInstance = new pubsub.Message(messageDataNoAttrs);
    const publishData: pubsub.MessagePublishedData<any> = {
      message: v2MessageInstance,
      subscription: "projects/aProject/subscriptions/aSubscription",
    };
    const event: CloudEvent<pubsub.MessagePublishedData<any>> = {
      specversion: "1.0",
      source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
      id: "event-id-789",
      type: EVENT_TRIGGER.eventType,
      time: messageDataNoAttrs.publishTime,
      data: publishData,
    };

    let capturedEvent: any;
    const func = pubsub.onMessagePublished("topic", (e) => {
      capturedEvent = e;
      return Promise.resolve();
    });

    await func(event);

    // Test the message getter for attributes
    expect(capturedEvent.message.attributes).to.deep.equal({});
    expect(capturedEvent.data.message.attributes).to.deep.equal({});
  });
});
