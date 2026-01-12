import { expect } from "chai";
import { EventContext } from "../../../src/v1/cloud-functions";

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

    const event: pubsub.PubSubCloudEvent<any> = {
      specversion: "1.0",
      source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
      id: "uuid",
      type: EVENT_TRIGGER.eventType,
      time: new Date().toISOString(),
      data: {
        message: { data: Buffer.from("input").toString("base64") } as any,
        subscription: "projects/aProject/subscriptions/aSubscription",
      },
      message: { data: Buffer.from("input").toString("base64") } as any,
      context: {} as EventContext,
    };

    const res = func.run(event);

    expect(res).to.deep.equal(event);
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
    const event: pubsub.PubSubCloudEvent<any> = {
      context: {} as EventContext,
      message: publishData.message as any,
      specversion: "1.0",
      source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
      id: "uuid",
      type: EVENT_TRIGGER.eventType,
      time: messageJSON.publishTime,
      data: publishData,
    };

    const func = pubsub.onMessagePublished("topic", (event) => {
      json = (event.data as any).message.json;
      return event;
    });

    const eventAgain = await func(event);

    // Deep equal uses JSON equality, so we'll still match even though
    // Message is a class and we passed an interface.
    expect(eventAgain).to.deep.equal(event);

    expect(json).to.deep.equal({ hello: "world" });
  });

  it("should construct a CloudEvent with the correct context and message", async () => {
    const publishTime = new Date().toISOString();
    const messagePayload = {
      messageId: "uuid",
      data: Buffer.from(JSON.stringify({ hello: "world" })).toString("base64"),
      publishTime,
    };
    const data: pubsub.MessagePublishedData = {
      message: messagePayload as any,
      subscription: "projects/aProject/subscriptions/aSubscription",
    };
    const event: pubsub.PubSubCloudEvent<pubsub.MessagePublishedData> = {
      context: {} as EventContext,
      message: data.message as any,
      specversion: "1.0",
      id: "uuid",
      time: publishTime,
      type: "google.cloud.pubsub.topic.v1.messagePublished",
      source: "//pubsub.googleapis.com/projects/aProject/topics/topic",
      data,
    };

    let destructuredMessage: pubsub.Message<any>;
    let context: EventContext;
    const func = pubsub.onMessagePublished("topic", (e: pubsub.PubSubCloudEvent<any>) => {
      destructuredMessage = e.message;
      context = e.context;
    });

    await func(event);

    expect(destructuredMessage.json).to.deep.equal({ hello: "world" });
    expect(context).to.exist;
    expect(context.eventId).to.equal("uuid");
    expect(context.timestamp).to.equal(publishTime);
    expect(context.eventType).to.equal("google.cloud.pubsub.topic.v1.messagePublished");
    expect(context.resource).to.deep.equal({
      service: "pubsub.googleapis.com",
      name: "projects/aProject/topics/topic",
    });
  });

  // These tests pass if the transpiler works
  it("allows desirable syntax", () => {
    pubsub.onMessagePublished<string>(
      "topic",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (event: pubsub.PubSubCloudEvent<string>) => undefined
    );
    pubsub.onMessagePublished<string>(
      "topic",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (event: pubsub.PubSubCloudEvent<any>) => undefined
    );
    pubsub.onMessagePublished(
      "topic",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (event: pubsub.PubSubCloudEvent<string>) => undefined
    );
    pubsub.onMessagePublished(
      "topic",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (event: pubsub.PubSubCloudEvent<any>) => undefined
    );
  });
});
