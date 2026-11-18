import { expect } from "chai";

import { Director } from "../../src/director";
import type { EventContext } from "../../src/v1/cloud-functions";
import type { CloudEvent } from "../../src/v2/core";
import { Message, MessagePublishedData } from "../../src/v2/providers/pubsub";

const CUTOFF = "2026-12-01T00:00:00.000Z";
const BEFORE = "2026-11-30T23:59:59.000Z";
const AFTER = "2026-12-01T00:00:01.000Z";

function makeV1EventContext(timestamp: string): EventContext {
  return {
    eventId: "evt-v1-alpha-101",
    eventType: "google.firestore.document.write",
    timestamp,
    resource: {
      service: "firestore.googleapis.com",
      name: "projects/proj-alpha/databases/(default)/documents/orders/order-42",
    },
    params: {
      orderId: "order-42",
    },
  };
}

function makeV2FirestoreEvent(time: string): CloudEvent<{ document: string }> {
  return {
    specversion: "1.0",
    id: "evt-v2-bravo-202",
    source: "//firestore.googleapis.com/projects/proj-alpha/databases/(default)",
    subject: "documents/foo/bar",
    type: "google.cloud.firestore.document.v1.written",
    time,
    data: {
      document: "foo/bar",
    },
  };
}

function makeV2PubSubEvent(
  publishTime: string,
  envelopeTime: string
): CloudEvent<MessagePublishedData<Record<string, string>>> {
  const message = new Message<Record<string, string>>({
    messageId: "msg-pubsub-303",
    data: Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64"),
    attributes: { origin: "billing-worker" },
    orderingKey: "shard-7",
    publishTime,
  });
  return {
    specversion: "1.0",
    id: "evt-pubsub-charlie-505",
    source: "//pubsub.googleapis.com/projects/proj-alpha/topics/topic-echo-606",
    type: "google.cloud.pubsub.topic.v1.messagePublished",
    time: envelopeTime,
    data: {
      message,
      subscription: "projects/proj-alpha/subscriptions/sub-delta-404",
    },
  };
}

describe("Director", () => {
  let originalKConfiguration: string | undefined;

  beforeEach(() => {
    originalKConfiguration = process.env.K_CONFIGURATION;
    delete process.env.K_CONFIGURATION;
  });

  afterEach(() => {
    if (typeof originalKConfiguration === "undefined") {
      delete process.env.K_CONFIGURATION;
    } else {
      process.env.K_CONFIGURATION = originalKConfiguration;
    }
  });

  describe("constructor", () => {
    it("accepts a valid Date or ISO 8601 string cutoff", () => {
      expect(() => new Director(new Date(CUTOFF))).to.not.throw();
      expect(() => new Director(CUTOFF)).to.not.throw();
    });

    it("throws on empty, whitespaced, or unparseable cutoff strings", () => {
      expect(() => new Director("")).to.throw(/valid cutoff/);
      expect(() => new Director("   " + CUTOFF)).to.throw(/Invalid timestamp/);
      expect(() => new Director("asfgil;huasiklduahsdl")).to.throw(/Invalid timestamp/);
    });
  });

  describe("upgrade", () => {
    it("routes pre-cutoff events to v1 and post-cutoff events to v2 with explicit upgrade set", async () => {
      const director = new Director(CUTOFF, { type: "upgrade" });

      expect(await director.shouldProcess(makeV1EventContext(BEFORE))).to.be.true;
      expect(await director.shouldProcess(makeV2FirestoreEvent(BEFORE))).to.be.false;

      expect(await director.shouldProcess(makeV1EventContext(AFTER))).to.be.false;
      expect(await director.shouldProcess(makeV2FirestoreEvent(AFTER))).to.be.true;
    });

    it("routes pre-cutoff events to v1 and post-cutoff events to v2 when options are omitted or empty", async () => {
      const omitDirector = new Director(CUTOFF);

      expect(await omitDirector.shouldProcess(makeV1EventContext(BEFORE))).to.be.true;
      expect(await omitDirector.shouldProcess(makeV2FirestoreEvent(BEFORE))).to.be.false;

      expect(await omitDirector.shouldProcess(makeV1EventContext(AFTER))).to.be.false;
      expect(await omitDirector.shouldProcess(makeV2FirestoreEvent(AFTER))).to.be.true;

      const emptyDirector = new Director(CUTOFF, {});

      expect(await emptyDirector.shouldProcess(makeV1EventContext(BEFORE))).to.be.true;
      expect(await emptyDirector.shouldProcess(makeV2FirestoreEvent(BEFORE))).to.be.false;

      expect(await emptyDirector.shouldProcess(makeV1EventContext(AFTER))).to.be.false;
      expect(await emptyDirector.shouldProcess(makeV2FirestoreEvent(AFTER))).to.be.true;
    });
  });

  describe("downgrade", () => {
    it("routes pre-cutoff events to v2 and post-cutoff events to v1", async () => {
      const director = new Director(new Date(CUTOFF), { type: "downgrade" });

      expect(await director.shouldProcess(makeV1EventContext(BEFORE))).to.be.false;
      expect(await director.shouldProcess(makeV2FirestoreEvent(BEFORE))).to.be.true;

      expect(await director.shouldProcess(makeV1EventContext(AFTER))).to.be.true;
      expect(await director.shouldProcess(makeV2FirestoreEvent(AFTER))).to.be.false;
    });
  });

  describe("v2 Pub/Sub timestamps", () => {
    it("uses data.message.publishTime rather than cloudEvent.time", async () => {
      const director = new Director(CUTOFF, { type: "upgrade" });

      const delayedPreCutoffEvent = makeV2PubSubEvent(
        "2026-11-30T23:59:59.500Z", // publish time
        "2026-12-01T00:00:02.000Z" // envelope time
      );
      expect(await director.shouldProcess(delayedPreCutoffEvent)).to.be.false;

      const postCutoffPubSubEvent = makeV2PubSubEvent(
        "2026-12-01T00:00:01.000Z", // publishTime
        "2026-12-01T00:00:01.250Z" // envelopeTime
      );
      expect(await director.shouldProcess(postCutoffPubSubEvent)).to.be.true;
    });
  });

  describe("environment detection", () => {
    it("sniffs v1/v2 from K_CONFIGURATION when passed a Date", async () => {
      const director = new Director(CUTOFF, { type: "upgrade" });

      delete process.env.K_CONFIGURATION;
      expect(await director.shouldProcess(new Date(BEFORE))).to.be.true;
      expect(await director.shouldProcess(new Date(AFTER))).to.be.false;

      process.env.K_CONFIGURATION = "orders-worker-v2-cfg";
      expect(await director.shouldProcess(new Date(BEFORE))).to.be.false;
      expect(await director.shouldProcess(new Date(AFTER))).to.be.true;
    });

    it("options.generation overrides K_CONFIGURATION", async () => {
      process.env.K_CONFIGURATION = "orders-worker-v2-cfg";
      const forcedV1Director = new Director(CUTOFF, {
        type: "upgrade",
        generation: "1",
      });
      expect(await forcedV1Director.shouldProcess(new Date(BEFORE))).to.be.true;
      expect(await forcedV1Director.shouldProcess(new Date(AFTER))).to.be.false;

      delete process.env.K_CONFIGURATION;
      const forcedV2Director = new Director(CUTOFF, {
        type: "upgrade",
        generation: "2",
      });
      expect(await forcedV2Director.shouldProcess(new Date(BEFORE))).to.be.false;
      expect(await forcedV2Director.shouldProcess(new Date(AFTER))).to.be.true;
    });
  });

  describe("invalid event timestamp handling", () => {
    it("rejects when passed an Invalid Date", async () => {
      const director = new Director(CUTOFF);
      await expect(director.shouldProcess(new Date("invalid-date"))).to.be.rejectedWith(Error);
    });

    it("rejects when EventContext or CloudEvent has an unparseable timestamp", async () => {
      const director = new Director(CUTOFF);
      await expect(
        director.shouldProcess(makeV1EventContext("not-an-iso-timestamp"))
      ).to.be.rejectedWith(Error);
      await expect(
        director.shouldProcess(makeV2FirestoreEvent("not-an-iso-timestamp"))
      ).to.be.rejectedWith(Error);
    });
  });
});
