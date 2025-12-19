import { describe, it, beforeAll, expect } from "vitest";
import { fetch } from "undici";
import { waitForEvent } from "../utils";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.client";
import { getFunctionUrl } from "../firebase.server";

describe("https.v1", () => {
  describe("httpsOnCallTrigger", () => {
    let data: any;
    let callData: any;

    beforeAll(async () => {
      data = await waitForEvent("httpsOnCallV1", async () => {
        const callable = httpsCallable(functions, "httpsV1OnCallTrigger");

        // v1 doesn't support streaming, so just call normally
        callData = await callable({
          foo: "bar",
        });
      });
    }, 60_000);

    it("should accept the correct data", () => {
      expect(data.data).toEqual({ foo: "bar" });
    });

    it("should return the correct data", () => {
      // TODO(ehesp): Check if this is correct
      // v1 returns the response body directly: https://firebase.google.com/docs/functions/callable-reference#response_body
      expect(callData.data).toBe("onCallV1");
    });
  });

  describe("httpsOnRequestTrigger", () => {
    let data: any;
    let status: number;
    let body: any;

    beforeAll(async () => {
      data = await waitForEvent("httpsOnRequestV1", async () => {
        const functionUrl = await getFunctionUrl("httpsV1OnRequestTrigger");
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ foo: "bar" }),
        });

        status = response.status;
        body = await response.text();
      });
    }, 60_000);

    it("should accept the correct data", () => {
      expect(data).toEqual({ foo: "bar" });
    });

    it("should return the correct status", () => {
      expect(status).toBe(201);
    });

    it("should return the correct body", () => {
      expect(body).toBe("onRequestV1");
    });
  });
});
