import { expect } from "chai";
import * as path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import type { ChildProcessWithoutNullStreams } from "child_process";
import * as portfinder from "portfinder";
import nodeFetch from "node-fetch";
import { createRequire } from "module";
import { setTimeout as delay } from "timers/promises";
import * as http from "http";

const fetch = (nodeFetch as unknown as { default?: typeof nodeFetch }).default ?? nodeFetch;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const nockModule = require("nock") as typeof import("nock") & { default?: typeof import("nock") };
const nock = nockModule.default ?? nockModule;

const cliPath = path.join(__dirname, "../../src/bin/firebase-functions.ts");
const functionsDir = path.join(__dirname, "fixtures");

async function waitForLogSubstring(
  getBuffer: () => string,
  needle: string,
  timeoutMs = 10000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (getBuffer().includes(needle)) {
      return;
    }
    await delay(50);
  }
  throw new Error(
    `Timed out waiting for log output containing "${needle}". Current log:\n${getBuffer()}`
  );
}

async function terminate(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.killed) {
    return;
  }
  child.kill("SIGINT");
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
  });
}

describe("function router CLI", () => {
  before(() => {
    nock.enableNetConnect("127.0.0.1");
  });

  after(() => {
    nock.disableNetConnect();
  });

  before(async function () {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = http.createServer();
        server.once("error", (err) => {
          server.close();
          reject(err);
        });
        server.listen(0, () => {
          server.close(() => resolve());
        });
      });
    } catch (err) {
      this.skip();
    }
  });

  it("serves HTTP and CloudEvent handlers", async function () {
    this.timeout(15000);
    const port = await portfinder.getPortPromise({ port: 4800, stopPort: 9000 });
    const child = spawn(
      process.execPath,
      ["-r", require.resolve("ts-node/register"), cliPath, functionsDir],
      {
        env: { ...process.env, PORT: String(port) },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    let stdoutLog = "";
    let stderrLog = "";
    child.stdout.on("data", (chunk) => {
      stdoutLog += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderrLog += chunk;
    });

    try {
      await waitForLogSubstring(() => stdoutLog, "[http] httpFunction -> /httpFunction");
      await waitForLogSubstring(() => stdoutLog, "[cloudevent] pubsubMessage -> /pubsubMessage");

      const httpResponse = await fetch(`http://127.0.0.1:${port}/httpFunction`);
      const httpBody = await httpResponse.text();
      const failureLogs = `Router stdout:\n${stdoutLog}\nRouter stderr:\n${stderrLog}`;
      expect(httpResponse.status, failureLogs).to.equal(200);
      expect(httpBody).to.equal("HTTP OK");

      const cloudEventResponse = await fetch(`http://127.0.0.1:${port}/pubsubMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/cloudevents+json" },
        body: JSON.stringify({
          specversion: "1.0",
          id: "evt-123",
          source: "//pubsub.googleapis.com/projects/demo/topics/sample",
          type: "google.cloud.pubsub.topic.v1.messagePublished",
          datacontenttype: "application/json",
          data: {
            message: {
              messageId: "1",
              attributes: {
                source: "integration-test",
              },
              data: Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64"),
              publishTime: "2024-01-01T00:00:00.000000Z",
            },
            subscription: "projects/demo-project/subscriptions/sample-sub",
          },
        }),
      });

      expect(cloudEventResponse.status, failureLogs).to.equal(204);
      await waitForLogSubstring(() => stdoutLog, "pubsubMessage invoked for integration-test");
    } finally {
      await terminate(child);
    }
  });
});
