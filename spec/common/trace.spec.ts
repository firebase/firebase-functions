import { expect } from "chai";
import { extractTraceContext } from "../../src/common/trace";

describe("getTraceContext", () => {
  it("reutrns undefined given object without trace properties", () => {
    expect(extractTraceContext({ foo: "bar" })).to.be.undefined;
  });

  describe("traceparent", () => {
    it("extracts trace context with sampling on", () => {
      expect(
        extractTraceContext({
          traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
        })
      ).to.deep.equal({
        version: "00",
        traceId: "0af7651916cd43dd8448eb211c80319c",
        parentId: "b7ad6b7169203331",
        sample: true,
      });
    });

    it("extracts trace context with sampling off", () => {
      expect(
        extractTraceContext({
          traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00",
        })
      ).to.deep.equal({
        version: "00",
        traceId: "0af7651916cd43dd8448eb211c80319c",
        parentId: "b7ad6b7169203331",
        sample: false,
      });
    });

    it("returns undefined given invalid trace id", () => {
      expect(extractTraceContext({ traceparent: "00-0af7651916cd43dd8448eb211c80319c-ABCDEFG-00" }))
        .to.be.undefined;
    });
  });

  describe("X-Cloud-Trace-Context", () => {
    it("extracts trace context with sampling on", () => {
      expect(
        extractTraceContext({
          ["X-Cloud-Trace-Context"]: "105445aa7843bc8bf206b12000100000/2450465917091935019;o=1",
        })
      ).to.deep.equal({
        version: "00",
        traceId: "105445aa7843bc8bf206b12000100000",
        parentId: "2201cdc4ba777400",
        sample: true,
      });
    });

    it("extracts trace context with sampling on indicated w/ o=3", () => {
      expect(
        extractTraceContext({
          ["X-Cloud-Trace-Context"]: "105445aa7843bc8bf206b12000100000/2450465917091935019;o=3",
        })
      ).to.deep.equal({
        version: "00",
        traceId: "105445aa7843bc8bf206b12000100000",
        parentId: "2201cdc4ba777400",
        sample: true,
      });
    });

    it("extracts trace context with sampling off", () => {
      expect(
        extractTraceContext({
          ["X-Cloud-Trace-Context"]: "105445aa7843bc8bf206b12000100000/2450465917091935019;o=0",
        })
      ).to.deep.equal({
        version: "00",
        traceId: "105445aa7843bc8bf206b12000100000",
        parentId: "2201cdc4ba777400",
        sample: false,
      });
    });

    it("extracts trace context with no sampling info", () => {
      expect(
        extractTraceContext({
          ["X-Cloud-Trace-Context"]: "105445aa7843bc8bf206b12000100000/2450465917091935019",
        })
      ).to.deep.equal({
        version: "00",
        traceId: "105445aa7843bc8bf206b12000100000",
        parentId: "2201cdc4ba777400",
        sample: false,
      });
    });

    it("returns undefined given invalid parentId", () => {
      expect(
        extractTraceContext({
          ["X-Cloud-Trace-Context"]: "105445aa7843bc8bf206b12000100000/abcedf;o=0",
        })
      ).to.be.undefined;
    });
  });
});
