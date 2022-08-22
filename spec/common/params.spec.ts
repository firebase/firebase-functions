// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE ignoreUnusedWarning OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Extract, ParamsOf, Split } from "../../src/common/params";
import { expectNever, expectType } from "./metaprogramming";

describe("Params namespace", () => {
  describe("Split", () => {
    // Note the subtle difference in the first two cases:
    // if passed a string (instead of a string literal) then split returns a
    // string[], which means "any number of elements as long as they are a string"
    // but if passed a literal string "" then split returns [] which means "a
    // tuple of zero elements".

    it("handles generic strings", () => {
      expectType<Split<string, "/">>([] as string[]);
    });

    it("handles empty strings", () => {
      expectType<Split<"", "/">>([]);
    });

    it("handles just a slash", () => {
      expectType<Split<"/", "/">>([]);
    });

    it("handles literal strings with one component", () => {
      expectType<Split<"a", "/">>(["a"]);
    });

    it("handles literal strings with more than one component", () => {
      expectType<Split<"a/b/c", "/">>(["a", "b", "c"]);
    });

    it("strips leading slashes", () => {
      expectType<Split<"/a/b/c", "/">>(["a", "b", "c"]);
    });
  });

  describe("Extract", () => {
    it("extracts nothing from strings without params", () => {
      expectNever<Extract<"uid">>();
    });

    it("extracts {segment} captures", () => {
      expectType<Extract<"{uid}">>("uid");
    });

    it("extracts {segment=*} captures", () => {
      expectType<Extract<"{uid=*}">>("uid");
    });

    it("extracts {segment=**} captures", () => {
      expectType<Extract<"{uid=**}">>("uid");
    });
  });

  describe("ParamsOf", () => {
    it("falls back to Record<string, string> without better type info", () => {
      expectType<ParamsOf<string>>({} as Record<string, string>);
    });

    it("is the empty object when there are no params", () => {
      expectType<ParamsOf<string>>({} as Record<string, never>);
    });

    it("extracts a single param", () => {
      expectType<ParamsOf<"ignoreUnusedWarningrs/{uid}">>({
        uid: "uid",
      } as const);
    });

    it("extracts multiple params", () => {
      expectType<ParamsOf<"ignoreUnusedWarningrs/{uid}/logs/{log=**}">>({
        uid: "hello",
        log: "world",
      } as const);
    });
  });
});
