import { expect } from "chai";

import { CloudEvent } from "../../../src/v2/core";
import * as options from "../../../src/v2/options";
import * as pubsub from "../../../src/v2/providers/pubsub";
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
      message: messageJSON as any,
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

  describe("v1 compatibility", () => {
    it("should expose v1-compatible 'message' getter", async () => {
      const messageJSON = {
        messageId: "uuid",
        data: Buffer.from("test data").toString("base64"),
        attributes: { key: "value" },
        orderingKey: "orderingKey",
        publishTime: new Date(Date.now()).toISOString(),
      };
      const publishData: pubsub.MessagePublishedData<any> = {
        message: messageJSON as any,
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

      let v1Message: any;
      const func = pubsub.onMessagePublished("topic", (event) => {
        v1Message = event.message;
        return event;
      });

      await func(event);

      expect(v1Message).to.exist;
      expect(v1Message.data).to.equal(messageJSON.data);
      expect(v1Message.attributes).to.deep.equal(messageJSON.attributes);
    });

    it("should expose v1-compatible 'context' getter", async () => {
      const messageJSON = {
        messageId: "uuid",
        data: Buffer.from("test data").toString("base64"),
        attributes: { key: "value" },
        orderingKey: "orderingKey",
        publishTime: new Date(Date.now()).toISOString(),
      };
      const publishData: pubsub.MessagePublishedData<any> = {
        message: messageJSON as any,
        subscription: "projects/aProject/subscriptions/aSubscription",
      };
      const eventTime = new Date(Date.now()).toISOString();
      const event: CloudEvent<pubsub.MessagePublishedData<any>> = {
        specversion: "1.0",
        source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
        subject: "projects/aProject/topics/topic",
        id: "event-uuid",
        type: EVENT_TRIGGER.eventType,
        time: eventTime,
        data: publishData,
      };

      let v1Context: any;
      const func = pubsub.onMessagePublished("topic", (event) => {
        v1Context = event.context;
        return event;
      });

      await func(event);

      expect(v1Context).to.exist;
      expect(v1Context.eventId).to.equal("event-uuid");
      expect(v1Context.timestamp).to.equal(eventTime);
      expect(v1Context.eventType).to.equal("google.pubsub.topic.publish");
      expect(v1Context.resource).to.exist;
      expect(v1Context.resource.service).to.equal("pubsub.googleapis.com");
      expect(v1Context.params).to.exist;
    });

    it("should allow destructuring v1-style properties", async () => {
      const messageJSON = {
        messageId: "uuid",
        data: Buffer.from(JSON.stringify({ hello: "world" })).toString("base64"),
        attributes: { key: "value" },
        orderingKey: "orderingKey",
        publishTime: new Date(Date.now()).toISOString(),
      };
      const publishData: pubsub.MessagePublishedData<any> = {
        message: messageJSON as any,
        subscription: "projects/aProject/subscriptions/aSubscription",
      };
      const event: CloudEvent<pubsub.MessagePublishedData<any>> = {
        specversion: "1.0",
        source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
        subject: "projects/aProject/topics/topic",
        id: "uuid",
        type: EVENT_TRIGGER.eventType,
        time: messageJSON.publishTime,
        data: publishData,
      };

      let extractedMessage: any;
      let extractedContext: any;

      const func = pubsub.onMessagePublished("topic", (event) => {
        // Destructure v1-style properties
        const { message, context } = event;
        extractedMessage = message;
        extractedContext = context;
        return event;
      });

      await func(event);

      expect(extractedMessage).to.exist;
      expect(extractedMessage.data).to.equal(messageJSON.data);
      expect(extractedContext).to.exist;
      expect(extractedContext.eventId).to.equal("uuid");
    });

    it("should allow access to both v1 and v2 properties", async () => {
      const messageJSON = {
        messageId: "uuid",
        data: Buffer.from("test data").toString("base64"),
        attributes: { key: "value" },
        orderingKey: "orderingKey",
        publishTime: new Date(Date.now()).toISOString(),
      };
      const publishData: pubsub.MessagePublishedData<any> = {
        message: messageJSON as any,
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

      let v1EventId: string;
      let v2EventId: string;

      const func = pubsub.onMessagePublished("topic", (event) => {
        // Access v1-style property
        v1EventId = event.context.eventId;
        // Access v2-style property
        v2EventId = event.id;
        return event;
      });

      await func(event);

      expect(v1EventId).to.equal("uuid");
      expect(v2EventId).to.equal("uuid");
      expect(v1EventId).to.equal(v2EventId);
    });

    it("should map v1 context fields to their v2 equivalents", async () => {
      const messageJSON = {
        messageId: "msg-123",
        data: Buffer.from("test data").toString("base64"),
        attributes: { key: "value" },
        orderingKey: "orderingKey",
        publishTime: "2023-01-01T00:00:00.000Z",
      };
      const publishData: pubsub.MessagePublishedData<any> = {
        message: messageJSON as any,
        subscription: "projects/aProject/subscriptions/aSubscription",
      };
      const event: CloudEvent<pubsub.MessagePublishedData<any>> = {
        specversion: "1.0",
        source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
        id: "event-456",
        type: EVENT_TRIGGER.eventType,
        time: "2023-01-01T00:00:00.000Z",
        data: publishData,
      };

      const func = pubsub.onMessagePublished("topic", (event) => {
        // v1 context.eventId should come from CloudEvent.id
        expect(event.context.eventId).to.equal("event-456");
        expect(event.context.eventId).to.equal(event.id);

        // v1 context.timestamp should come from CloudEvent.time
        expect(event.context.timestamp).to.equal("2023-01-01T00:00:00.000Z");
        expect(event.context.timestamp).to.equal(event.time);

        // v2 message.messageId is separate from context.eventId
        expect(event.data.message.messageId).to.equal("msg-123");

        // v2 message.publishTime is the same as CloudEvent.time
        expect(event.data.message.publishTime).to.equal("2023-01-01T00:00:00.000Z");

        return event;
      });

      await func(event);
    });
  });
});
