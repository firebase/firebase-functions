/// <reference path="../../typings/main.d.ts" />

import DatabaseDeltaSnapshot from "../../src/database/delta-snapshot";
import {expect as expect} from "chai";

describe("DatabaseDeltaSnapshot", () => {
  let subject;
  let populate = (old: any, change: any) => {
    subject = new DatabaseDeltaSnapshot({
      path: "/foo",
      oldData: old,
      change: change,
      authToken: null
    });
  };

  describe("#val(): any", () => {
    it("should return child values based on the child path", () => {
      populate({a: {b: "c"}}, {a: {d: "e"}});
      expect(subject.child("a").val()).to.deep.equal({b: "c", d: "e"});
    });

    it("should return null for children past a leaf", () => {
      populate({a: 23}, {b: 33});
      expect(subject.child("a/b").val()).to.be.null;
      expect(subject.child("b/c").val()).to.be.null;
    });

    it("should return a leaf value", () => {
      populate(null, 23);
      expect(subject.val()).to.eq(23);
      populate({a: 23}, {b: 23, a: null});
      expect(subject.child("b").val()).to.eq(23);
    });
  });

  describe("#exists(): boolean", () => {
    it("should be true for an object value", () => {
      populate(null, {a: {b: "c"}});
      expect(subject.child("a").exists()).to.be.true;
    });

    it("should be true for a leaf value", () => {
      populate(null, {a: {b: "c"}});
      expect(subject.child("a/b").exists()).to.be.true;
    });

    it("should be false for a non-existent value", () => {
      populate(null, {a: {b: "c"}});
      expect(subject.child("d").exists()).to.be.false;
    });

    it("should be false for a value pathed beyond a leaf", () => {
      populate(null, {a: {b: "c"}});
      expect(subject.child("a/b/c").exists()).to.be.false;
    });
  });

  describe("#prior(): DatabaseDeltaSnapshot", () => {
    it("should cause val() to return old data only", () => {
      populate({a: "b"}, {a: "c", d: "c"});
      expect(subject.prior().child("a").val()).to.equal("b");
    });
  });

  describe("#changed(): boolean", () => {
    it("should be true only when the current value has changed", () => {
      populate({a: {b: "c"}}, {a: {d: "e"}});
      expect(subject.child("a").changed()).to.be.true;
      expect(subject.child("a/b").changed()).to.be.false;
    });

    it("should be true when going to or from a null value", () => {
      populate(null, "foo");
      expect(subject.changed()).to.be.true;
      populate("foo", null);
      expect(subject.changed()).to.be.true;
    });
  });

  describe("#forEach(childAction: Function)", () => {
    it("should iterate through child snapshots", () => {
      populate({a: "b"}, {c: "d"});
      let out = "";
      subject.forEach(snap => {
        out += snap.val();
      });
      expect(out).to.equal("bd");
    });

    it("should not execute for leaf or null nodes", () => {
      populate(null, 23);
      let count = 0;
      let counter = snap => count++;

      subject.forEach(counter);
      populate(23, null);

      subject.forEach(counter);
      expect(count).to.eq(0);
    });
  });
});
