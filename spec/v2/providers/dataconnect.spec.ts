// The MIT License (MIT)
//
// Copyright (c) 2025 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { expect } from "chai";
import * as dataconnect from "../../../src/v2/providers/dataconnect";
import { CloudEvent } from "../../../src/v2";
import { onInit } from "../../../src/v2/core";

const expectedEndpointBase = {
  platform: "gcfv2",
  availableMemoryMb: {},
  concurrency: {},
  ingressSettings: {},
  maxInstances: {},
  minInstances: {},
  serviceAccountEmail: {},
  timeoutSeconds: {},
  vpc: {},
  labels: {},
};

function makeExpectedEndpoint(eventType: string, eventFilters, eventFilterPathPatterns) {
  return {
    ...expectedEndpointBase,
    eventTrigger: {
      eventType,
      eventFilters,
      eventFilterPathPatterns,
      retry: false,
    },
  };
}

describe("dataconnect", () => {
  describe("onMutationExecuted", () => {
    it("should create a func", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          connector: "my-connector",
          operation: "my-operation",
        },
        {}
      );

      const func = dataconnect.onMutationExecuted(
        "services/my-service/connectors/my-connector/operations/my-operation",
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func using param opts", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          connector: "my-connector",
          operation: "my-operation",
        },
        {}
      );

      const func = dataconnect.onMutationExecuted(
        {
          service: "my-service",
          connector: "my-connector",
          operation: "my-operation",
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func with a service path pattern", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          connector: "my-connector",
          operation: "my-operation",
        },
        {
          service: "{service}",
        }
      );

      const func = dataconnect.onMutationExecuted(
        "services/{service}/connectors/my-connector/operations/my-operation",
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func using param opts with a service path pattern", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          connector: "my-connector",
          operation: "my-operation",
        },
        {
          service: "{service}",
        }
      );

      const func = dataconnect.onMutationExecuted(
        {
          service: "{service}",
          connector: "my-connector",
          operation: "my-operation",
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func with a connector path pattern", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          operation: "my-operation",
        },
        {
          connector: "{connector}",
        }
      );

      const func = dataconnect.onMutationExecuted(
        "services/my-service/connectors/{connector}/operations/my-operation",
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func using param opts with a connector path pattern", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          operation: "my-operation",
        },
        {
          connector: "{connector}",
        }
      );

      const func = dataconnect.onMutationExecuted(
        {
          service: "my-service",
          connector: "{connector}",
          operation: "my-operation",
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func with an operation path pattern", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          connector: "my-connector",
        },
        {
          operation: "{operation}",
        }
      );

      const func = dataconnect.onMutationExecuted(
        "services/my-service/connectors/my-connector/operations/{operation}",
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func using param opts with an operation path pattern", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          connector: "my-connector",
        },
        {
          operation: "{operation}",
        }
      );

      const func = dataconnect.onMutationExecuted(
        {
          service: "my-service",
          connector: "my-connector",
          operation: "{operation}",
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func with path patterns", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {},
        {
          service: "{service}",
          connector: "{connector}",
          operation: "{operation}",
        }
      );

      const func = dataconnect.onMutationExecuted(
        "services/{service}/connectors/{connector}/operations/{operation}",
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func using param opts with path patterns", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {},
        {
          service: "{service}",
          connector: "{connector}",
          operation: "{operation}",
        }
      );

      const func = dataconnect.onMutationExecuted(
        {
          service: "{service}",
          connector: "{connector}",
          operation: "{operation}",
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func with a service wildcard", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          connector: "my-connector",
          operation: "my-operation",
        },
        {
          service: "*",
        }
      );

      const func = dataconnect.onMutationExecuted(
        "services/*/connectors/my-connector/operations/my-operation",
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func using param opts with a service wildcard", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          connector: "my-connector",
          operation: "my-operation",
        },
        {
          service: "*",
        }
      );

      const func = dataconnect.onMutationExecuted(
        {
          service: "*",
          connector: "my-connector",
          operation: "my-operation",
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func with a connector wildcard", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          operation: "my-operation",
        },
        {
          connector: "*",
        }
      );

      const func = dataconnect.onMutationExecuted(
        "services/my-service/connectors/*/operations/my-operation",
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func using param opts with a connector wildcard", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          operation: "my-operation",
        },
        {
          connector: "*",
        }
      );

      const func = dataconnect.onMutationExecuted(
        {
          service: "my-service",
          connector: "*",
          operation: "my-operation",
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func with an operation wildcard", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          connector: "my-connector",
        },
        {
          operation: "*",
        }
      );

      const func = dataconnect.onMutationExecuted(
        "services/my-service/connectors/my-connector/operations/*",
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func using param opts with an operation wildcard", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {
          service: "my-service",
          connector: "my-connector",
        },
        {
          operation: "*",
        }
      );

      const func = dataconnect.onMutationExecuted(
        {
          service: "my-service",
          connector: "my-connector",
          operation: "*",
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func with wildcards", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {},
        {
          service: "*",
          connector: "*",
          operation: "*",
        }
      );

      const func = dataconnect.onMutationExecuted(
        "services/*/connectors/*/operations/*",
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("should create a func using param opts with wildcards", () => {
      const expectedEndpoint = makeExpectedEndpoint(
        dataconnect.mutationExecutedEventType,
        {},
        {
          service: "*",
          connector: "*",
          operation: "*",
        }
      );

      const func = dataconnect.onMutationExecuted(
        {
          service: "*",
          connector: "*",
          operation: "*",
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEndpoint);
    });

    it("calls init function", async () => {
      const event: CloudEvent<string> = {
        specversion: "1.0",
        id: "id",
        source: "google.firebase.dataconnect.connector.v1.mutationExecuted",
        type: "type",
        time: "time",
        data: "data",
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await dataconnect.onMutationExecuted(
        "services/*/connectors/*/operations/*",
        () => null
      )(event);
      expect(hello).to.equal("world");
    });
  });
});
