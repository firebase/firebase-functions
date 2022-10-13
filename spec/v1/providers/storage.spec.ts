// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
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
import { Event } from "../../../src/v1";
import * as config from "../../../src/common/config";
import * as functions from "../../../src/v1";
import * as storage from "../../../src/v1/providers/storage";
import { MINIMAL_V1_ENDPOINT } from "../../fixtures";

describe("Storage Functions", () => {
  describe("ObjectBuilder", () => {
    function expectedEndpoint(bucket: string, eventType: string) {
      return {
        ...MINIMAL_V1_ENDPOINT,
        platform: "gcfv1",
        eventTrigger: {
          eventFilters: {
            resource: `projects/_/buckets/${bucket}`,
          },
          eventType: `google.storage.object.${eventType}`,
          retry: false,
        },
        labels: {},
      };
    }

    const defaultBucket = "bucket";

    before(() => {
      config.resetCache({
        storageBucket: defaultBucket,
      });
    });

    after(() => {
      config.resetCache();
    });

    it("should allow both region and runtime options to be set", () => {
      const fn = functions
        .region("us-east1")
        .runWith({
          timeoutSeconds: 90,
          memory: "256MB",
        })
        .storage.object()
        .onArchive(() => null);

      expect(fn.__endpoint.region).to.deep.equal(["us-east1"]);
      expect(fn.__endpoint.availableMemoryMb).to.deep.equal(256);
      expect(fn.__endpoint.timeoutSeconds).to.deep.equal(90);
    });

    describe("#onArchive", () => {
      it("should return a TriggerDefinition with appropriate values", () => {
        const cloudFunction = storage
          .bucket("bucky")
          .object()
          .onArchive(() => null);

        expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint("bucky", "archive"));
      });

      it("should use the default bucket when none is provided", () => {
        const cloudFunction = storage.object().onArchive(() => null);

        expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint(defaultBucket, "archive"));
      });

      it("should allow fully qualified bucket names", () => {
        const subjectQualified = new storage.ObjectBuilder(() => "projects/_/buckets/bucky", {});
        const result = subjectQualified.onArchive(() => null);

        expect(result.__endpoint).to.deep.equal(expectedEndpoint("bucky", "archive"));
      });

      it("should throw with improperly formatted buckets", () => {
        expect(
          () =>
            storage
              .bucket("bad/bucket/format")
              .object()
              .onArchive(() => null).__endpoint
        ).to.throw(Error);
      });

      it("should not mess with media links using non-literal slashes", () => {
        const cloudFunction = storage.object().onArchive((data) => {
          return data.mediaLink;
        });
        const goodMediaLinkEvent: Event = {
          data: {
            mediaLink:
              "https://www.googleapis.com/storage/v1/b/mybucket.appspot.com" +
              "/o/nestedfolder%2Fanotherfolder%2Fmyobject.file?generation=12345&alt=media",
          },
          context: {
            eventId: "70172329041928",
            timestamp: "2018-04-09T07:56:12.975Z",
            eventType: "google.storage.object.archive",
            resource: {
              service: "storage.googleapis.com",
              name: "projects/_/buckets/bucky",
            },
          },
        };
        return cloudFunction(goodMediaLinkEvent.data, goodMediaLinkEvent.context).then(
          (result: any) => {
            expect(result).equals(goodMediaLinkEvent.data.mediaLink);
          }
        );
      });
    });

    describe("#onDelete", () => {
      it("should return a TriggerDefinition with appropriate values", () => {
        const cloudFunction = storage
          .bucket("bucky")
          .object()
          .onDelete(() => null);

        expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint("bucky", "delete"));
      });

      it("should use the default bucket when none is provided", () => {
        const cloudFunction = storage.object().onDelete(() => null);

        expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint(defaultBucket, "delete"));
      });

      it("should allow fully qualified bucket names", () => {
        const subjectQualified = new storage.ObjectBuilder(() => "projects/_/buckets/bucky", {});
        const result = subjectQualified.onDelete(() => null);

        expect(result.__endpoint).to.deep.equal(expectedEndpoint("bucky", "delete"));
      });

      it("should throw with improperly formatted buckets", () => {
        const fn = storage
          .bucket("bad/bucket/format")
          .object()
          .onDelete(() => null);

        expect(() => fn.__endpoint).to.throw(Error);
      });

      it("should not mess with media links using non-literal slashes", () => {
        const cloudFunction = storage.object().onDelete((data) => {
          return data.mediaLink;
        });
        const goodMediaLinkEvent = {
          data: {
            mediaLink:
              "https://www.googleapis.com/storage/v1/b/mybucket.appspot.com" +
              "/o/nestedfolder%2Fanotherfolder%2Fmyobject.file?generation=12345&alt=media",
          },
          context: {
            eventId: "70172329041928",
            timestamp: "2018-04-09T07:56:12.975Z",
            eventType: "google.storage.object.delete",
            resource: {
              service: "storage.googleapis.com",
              name: "projects/_/buckets/bucky",
            },
          },
        };
        return cloudFunction(goodMediaLinkEvent.data, goodMediaLinkEvent.context).then(
          (result: any) => {
            expect(result).equals(goodMediaLinkEvent.data.mediaLink);
          }
        );
      });
    });

    describe("#onFinalize", () => {
      it("should return a TriggerDefinition with appropriate values", () => {
        const cloudFunction = storage
          .bucket("bucky")
          .object()
          .onFinalize(() => null);

        expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint("bucky", "finalize"));
      });

      it("should use the default bucket when none is provided", () => {
        const cloudFunction = storage.object().onFinalize(() => null);

        expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint(defaultBucket, "finalize"));
      });

      it("should allow fully qualified bucket names", () => {
        const subjectQualified = new storage.ObjectBuilder(() => "projects/_/buckets/bucky", {});
        const result = subjectQualified.onFinalize(() => null);

        expect(result.__endpoint).to.deep.equal(expectedEndpoint("bucky", "finalize"));
      });

      it("should throw with improperly formatted buckets", () => {
        const fn = storage
          .bucket("bad/bucket/format")
          .object()
          .onFinalize(() => null);

        expect(() => fn.__endpoint).to.throw(Error);
      });

      it("should not mess with media links using non-literal slashes", () => {
        const cloudFunction = storage.object().onFinalize((data) => {
          return data.mediaLink;
        });
        const goodMediaLinkEvent = {
          data: {
            mediaLink:
              "https://www.googleapis.com/storage/v1/b/mybucket.appspot.com" +
              "/o/nestedfolder%2Fanotherfolder%2Fmyobject.file?generation=12345&alt=media",
          },
          context: {
            eventId: "70172329041928",
            timestamp: "2018-04-09T07:56:12.975Z",
            eventType: "google.storage.object.finalize",
            resource: {
              service: "storage.googleapis.com",
              name: "projects/_/buckets/bucky",
            },
          },
        };
        return cloudFunction(goodMediaLinkEvent.data, goodMediaLinkEvent.context).then(
          (result: any) => {
            expect(result).equals(goodMediaLinkEvent.data.mediaLink);
          }
        );
      });
    });

    describe("#onMetadataUpdate", () => {
      it("should return a TriggerDefinition with appropriate values", () => {
        const cloudFunction = storage
          .bucket("bucky")
          .object()
          .onMetadataUpdate(() => null);

        expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint("bucky", "metadataUpdate"));
      });

      it("should use the default bucket when none is provided", () => {
        const cloudFunction = storage.object().onMetadataUpdate(() => null);

        expect(cloudFunction.__endpoint).to.deep.equal(
          expectedEndpoint(defaultBucket, "metadataUpdate")
        );
      });

      it("should allow fully qualified bucket names", () => {
        const subjectQualified = new storage.ObjectBuilder(() => "projects/_/buckets/bucky", {});
        const result = subjectQualified.onMetadataUpdate(() => null);

        expect(result.__endpoint).to.deep.equal(expectedEndpoint("bucky", "metadataUpdate"));
      });

      it("should throw with improperly formatted buckets", () => {
        const fn = storage
          .bucket("bad/bucket/format")
          .object()
          .onMetadataUpdate(() => null);

        expect(() => fn.__endpoint).to.throw(Error);
      });

      it("should not mess with media links using non-literal slashes", () => {
        const cloudFunction = storage.object().onMetadataUpdate((data) => {
          return data.mediaLink;
        });
        const goodMediaLinkEvent = {
          data: {
            mediaLink:
              "https://www.googleapis.com/storage/v1/b/mybucket.appspot.com" +
              "/o/nestedfolder%2Fanotherfolder%2Fmyobject.file?generation=12345&alt=media",
          },
          context: {
            eventId: "70172329041928",
            timestamp: "2018-04-09T07:56:12.975Z",
            eventType: "google.storage.object.metadataUpdate",
            resource: {
              service: "storage.googleapis.com",
              name: "projects/_/buckets/bucky",
            },
          },
        };
        return cloudFunction(goodMediaLinkEvent.data, goodMediaLinkEvent.context).then(
          (result: any) => {
            expect(result).equals(goodMediaLinkEvent.data.mediaLink);
          }
        );
      });
    });
  });

  describe("process.env.FIREBASE_CONFIG not set", () => {
    beforeEach(() => {
      (config as any).firebaseConfigCache = null;
      delete process.env.FIREBASE_CONFIG;
    });

    it("should not throw if __endpoint is not accessed", () => {
      expect(() => storage.object().onArchive(() => null)).to.not.throw(Error);
    });

    it("should throw when endpoint is accessed", () => {
      expect(() => storage.object().onArchive(() => null).__endpoint).to.throw(Error);
    });

    it("should not throw when #run is called", () => {
      const cf = storage.object().onArchive(() => null);
      expect(cf.run).to.not.throw(Error);
    });
  });
});
