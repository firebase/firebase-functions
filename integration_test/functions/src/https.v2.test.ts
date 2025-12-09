import { describe, it, beforeAll, expect } from "vitest";
import { fetch } from "undici";
import { waitForEvent } from "./utils";
import { httpsCallable } from "firebase/functions";
import { functions } from "./client";

describe("https.v2", () => {
  describe("httpsOnCallTrigger", () => {
    let data: any;
    let callData: any;
    let streamData: any[] = [];

    beforeAll(async () => {
      data = await waitForEvent("httpsOnCall", async () => {
        const callable = httpsCallable(functions, "httpsOnCallTrigger");

        const { stream, data: result } = await callable.stream({
          foo: "bar",
        });

        for await (const chunk of stream) {
          streamData.push(chunk);
        }

        // Await the final result of the callable
        callData = await result;
      });
    }, 60_000);

    it("should accept the correct data", () => {
      expect(data.acceptsStreaming).toBe(true);
      expect(data.data).toEqual({ foo: "bar" });
    });

    it("should return the correct data", () => {
      expect(callData).toBe("onCall");
    });

    it("should stream the correct data", () => {
      expect(streamData).toEqual(["onCallStreamed"]);
    });
  });

  describe("httpsOnRequestTrigger", () => {
    let data: any;
    let status: number;
    let body: any;

    beforeAll(async () => {
      data = await waitForEvent("httpsOnRequest", async () => {
        console.log("Fetching...");
        const response = await fetch(
          "https://us-central1-cf3-integration-tests-v2-qa.cloudfunctions.net/httpsOnRequestTrigger",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ foo: "bar" }),
          }
        );

        console.log("Response:", response);

        status = response.status;
        console.log("Status:", status);
        body = await response.text();
        console.log("Body:", body);
      });
    }, 60_000);

    it("should accept the correct data", () => {
      expect(data).toEqual({ foo: "bar" });
    });

    it("should return the correct status", () => {
      expect(status).toBe(201);
    });

    it("should return the correct body", () => {
      expect(body).toBe("onRequest");
    });
  });
});
