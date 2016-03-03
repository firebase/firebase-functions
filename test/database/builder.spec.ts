/// <reference path="../../typings/main.d.ts" />

import DatabaseBuilder from "../../src/database/builder";
import {expect as expect} from "chai";

describe("DatabaseBuilder", () => {
  let subject: DatabaseBuilder;
  beforeEach(() => {
    subject = new DatabaseBuilder();
  });

  describe("#path()", () => {
    it("should append paths if called multiple times", () => {
      subject.path("first/bit");
      subject.path("{id}/second/bit");
      return expect(subject._toConfig().path).to.eq("/first/bit/{id}/second/bit");
    });
  });

  describe("#_toConfig()", () => {
    it("should return 'write' as the default event type", () => {
      expect(subject._toConfig().event).to.eq("write");
    });
  });
});
