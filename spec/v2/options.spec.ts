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
import { defineJsonSecret, defineSecret } from "../../src/params";
import { GlobalOptions } from "../../src/v2/options";

describe("GlobalOptions", () => {
  it("should accept all valid secret types in secrets array (type test)", () => {
    // This is a compile-time type test. If any of these types are not assignable
    // to the secrets array, TypeScript will fail to compile this test file.
    const jsonSecret = defineJsonSecret<{ key: string }>("JSON_SECRET");
    const stringSecret = defineSecret("STRING_SECRET");
    const plainSecret = "PLAIN_SECRET";

    const opts: GlobalOptions = {
      secrets: [plainSecret, stringSecret, jsonSecret],
    };

    expect(opts.secrets).to.have.length(3);
  });
});
