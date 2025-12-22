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
import fs from "fs";
import * as sinon from "sinon";
import * as dataconnect from "../../../src/v2/providers/dataconnect";
import { CloudEvent } from "../../../src/v2";
import { onInit } from "../../../src/v2/core";
import { expectExtends } from "../../common/metaprogramming";

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
  describe("params", () => {
    it("extracts {segment} captures", () => {
      expectExtends<
        Record<"myConnector", string>,
        dataconnect.DataConnectParams<"/{myConnector}">
      >();
    });

    it("extracts nothing from strings without params", () => {
      expectExtends<Record<never, string>, dataconnect.DataConnectParams<"foo/bar">>();
      expectExtends<Record<never, string>, dataconnect.DataConnectParams<"/foo/bar">>();
    });

    it("extracts {segment} captures from options", () => {
      expectExtends<
        Record<"myService", string>,
        dataconnect.DataConnectParams<{
          service: "{myService}";
          connector: "connector";
          operation: "operation";
        }>
      >();

      expectExtends<
        { myService: string; [key: string]: string },
        dataconnect.DataConnectParams<
          dataconnect.OperationOptions<"{myService}", "connector", "operation">
        >
      >();
    });

    it("extracts {segment=*} captures from options", () => {
      expectExtends<
        Record<"myConnector", string>,
        dataconnect.DataConnectParams<
          dataconnect.OperationOptions<string, "{myConnector=*}", string>
        >
      >();
    });

    it("extracts {segment=**} captures from options", () => {
      expectExtends<
        Record<"myOperation", string>,
        dataconnect.DataConnectParams<
          dataconnect.OperationOptions<string, "unused", "{myOperation=**}">
        >
      >();
    });

    it("extracts multiple captures from options", () => {
      expectExtends<
        Record<"myService" | "myConnector" | "myOperation", string>,
        dataconnect.DataConnectParams<
          dataconnect.OperationOptions<"{myService}", "{myConnector=*}", "{myOperation=**}">
        >
      >();
    });

    it("extracts nothing from options without params", () => {
      expectExtends<
        Record<never, string>,
        dataconnect.DataConnectParams<{
          service: "service";
          connector: "connector";
          operation: "operation";
        }>
      >();

      expectExtends<
        Record<never, string>,
        dataconnect.DataConnectParams<dataconnect.OperationOptions<string, string, string>>
      >();
    });
  });

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

    it("should create a func in the absence of param opts", () => {
      const expectedEndpoint = makeExpectedEndpoint(dataconnect.mutationExecutedEventType, {}, {});

      const func = dataconnect.onMutationExecuted({}, () => true);
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

  describe("initGraphqlServer", () => {
    let fsStub: sinon.SinonStub;

    beforeEach(() => {
      fsStub = sinon.stub(fs, "readFileSync");
    });

    afterEach(() => {
      sinon.restore();
    });

    it("both `schema` and `schemaFilePath` set", async () => {
      const opts = {
        schema: "type Query { hello: String }",
        schemaFilePath: "schema.gql",
        resolvers: {
          query: {
            hello: () => "Hello, world!",
          },
        },
      };
      try {
        await dataconnect.initGraphqlServer(opts);
      } catch (err: any) {
        expect(err.message).to.equal(
          "Exactly one of 'schema' or 'schemaFilePath' must be provided."
        );
      }
    });
    it("neither `schema` nor `schemaFilePath` set", async () => {
      const opts = {
        resolvers: {
          query: {
            hello: () => "Hello, world!",
          },
        },
      };
      try {
        await dataconnect.initGraphqlServer(opts);
      } catch (err: any) {
        expect(err.message).to.equal(
          "Exactly one of 'schema' or 'schemaFilePath' must be provided."
        );
      }
    });
    it("cannot read file in `schemaFilePath`", async () => {
      fsStub.throws(new Error("test file not found error"));
      const opts = {
        schemaFilePath: "schema.gql",
        resolvers: {
          query: {
            hello: () => "Hello, world!",
          },
        },
      };
      try {
        await dataconnect.initGraphqlServer(opts);
      } catch (err: any) {
        expect(err.message).to.contain("test file not found error");
      }
    });
    it("no resolvers provided", async () => {
      const opts = {
        schema: "type Query { hello: String }",
        resolvers: {},
      };
      try {
        await dataconnect.initGraphqlServer(opts);
      } catch (err: any) {
        expect(err.message).to.equal("At least one query or mutation resolver must be provided.");
      }
    });
  });

  describe("onGraphRequest", () => {
    it("returns callable function without schemaFilePath Data Connect trigger", () => {
      const opts = {
        schema: "type Query { hello: String }",
        resolvers: {
          query: {
            hello: () => "Hello, world!",
          },
        },
      };
      const func = dataconnect.onGraphRequest(opts);
      expect(func.__endpoint).to.deep.equal({
        ...expectedEndpointBase,
        dataConnectGraphqlTrigger: {},
      });
    });
    it("returns callable function with schemaFilePath Data Connect trigger", () => {
      const opts = {
        schemaFilePath: "schema.gql",
        resolvers: {
          query: {
            hello: () => "Hello, world!",
          },
        },
      };
      const func = dataconnect.onGraphRequest(opts);
      expect(func.__endpoint).to.deep.equal({
        ...expectedEndpointBase,
        dataConnectGraphqlTrigger: {
          schemaFilePath: "schema.gql",
        },
      });
    });
    it("returns callable function with request opts with Data Connect trigger", () => {
      const opts = {
        invoker: ["test-service-account@test.com"],
        region: "us-east4",
        schemaFilePath: "schema.gql",
        resolvers: {
          query: {
            hello: () => "Hello, world!",
          },
        },
      };
      const func = dataconnect.onGraphRequest(opts);
      expect(func.__endpoint).to.deep.equal({
        ...expectedEndpointBase,
        dataConnectGraphqlTrigger: {
          invoker: ["test-service-account@test.com"],
          schemaFilePath: "schema.gql",
        },
        region: ["us-east4"],
      });
    });
  });
});
