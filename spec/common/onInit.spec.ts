import { expect } from "chai";
import { onInit, withInit } from "../../src/common/onInit";

describe("withInit", () => {
  it("runs an async init callback once across concurrent calls", async () => {
    let initCalls = 0;
    let finishInit: () => void = () => undefined;
    const initDone = new Promise<void>((resolve) => {
      finishInit = resolve;
    });
    onInit(() => {
      initCalls++;
      return initDone;
    });

    let handlerCalls = 0;
    const func = withInit(() => {
      handlerCalls++;
    });

    const pending = [func(), func(), func()];
    finishInit();
    await Promise.all(pending);

    expect(initCalls).to.equal(1);
    expect(handlerCalls).to.equal(3);

    await func();
    expect(initCalls).to.equal(1);
    expect(handlerCalls).to.equal(4);
  });

  it("runs a sync init callback once", async () => {
    let initCalls = 0;
    onInit(() => {
      initCalls++;
    });
    const func = withInit(() => undefined);

    await Promise.all([func(), func()]);
    await func();

    expect(initCalls).to.equal(1);
  });

  it("retries init on the next call after it rejects", async () => {
    let initCalls = 0;
    onInit(() => {
      initCalls++;
      return initCalls === 1 ? Promise.reject(new Error("init failed")) : Promise.resolve();
    });

    let handlerCalls = 0;
    const func = withInit(() => {
      handlerCalls++;
    });

    const results = await Promise.allSettled([func(), func()]);
    expect(results.map((r) => r.status)).to.deep.equal(["rejected", "rejected"]);
    expect(initCalls).to.equal(1);
    expect(handlerCalls).to.equal(0);

    await func();
    expect(initCalls).to.equal(2);
    expect(handlerCalls).to.equal(1);

    await func();
    expect(initCalls).to.equal(2);
    expect(handlerCalls).to.equal(2);
  });
});
