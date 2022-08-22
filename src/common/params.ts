// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
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

/** @internal */
export type Split<S extends string, D extends string> =
  // A non-literal string splits into a string[]
  string extends S
    ? string[]
    : // A literal empty string turns into a zero-tuple
    S extends ""
    ? []
    : // Split the string; Head may be the empty string
    S extends `${D}${infer Tail}`
    ? [...Split<Tail, D>]
    : S extends `${infer Head}${D}${infer Tail}`
    ? [Head, ...Split<Tail, D>]
    : // A string without delimiters splits into an array of itself
      [S];

/** @internal */
export type NullSafe<S extends null | undefined | string> = S extends null
  ? never
  : S extends undefined
  ? never
  : S extends string
  ? S
  : never;

/** @internal */
export type Extract<Part extends string> = Part extends `{${infer Param}=**}`
  ? Param
  : Part extends `{${infer Param}=*}`
  ? Param
  : Part extends `{${infer Param}}`
  ? Param
  : never;

/**
 * A type that maps all parameter capture gropus into keys of a record.
 * For example, ParamsOf<"users/{uid}"> is { uid: string }
 * ParamsOf<"users/{uid}/logs/{log}"> is { uid: string; log: string }
 * ParamsOf<"some/static/data"> is {}
 *
 * For flexibility reasons, ParamsOf<string> is Record<string, string>
 */
export type ParamsOf<PathPattern extends string> =
  // if we have lost type information, revert back to an untyped dictionary
  string extends PathPattern
    ? Record<string, string>
    : {
        [Key in Extract<Split<NullSafe<PathPattern>, "/">[number]>]: string;
      };
