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
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Extract, ParamsOf, Split } from '../../src/common/params';
import { IsNever, SameType, use } from './metaprogramming';

describe('Params namespace', () => {
  describe('Split', () => {
    it('handles generic strings', () => {
      // @ts-ignore
      const assertion: SameType<Split<string, '/'>, string[]> = true;
      use(assertion);
    });

    it('handles literal strings with one component', () => {
      const assertion: SameType<Split<'a', '/'>, ['a']> = true;
      use(assertion);
    });

    it('handles literal strings with more than one component', () => {
      const assertion: SameType<Split<'a/b/c', '/'>, ['a', 'b', 'c']> = true;
      use(assertion);
    });

    it('strips leading slashes', () => {
      const assertion: SameType<Split<'/a/b/c', '/'>, ['a', 'b', 'c']> = true;
      use(assertion);
    });

    it('handles empty strings', () => {
      const assertion: SameType<Split<'', '/'>, []> = true;
      use(assertion);
    });

    it('handles just a slash', () => {
      const assertion: SameType<Split<'/', '/'>, []> = true;
      use(assertion);
    });
  });

  describe('Extract', () => {
    it('extracts nothing from strings without params', () => {
      const assertion: IsNever<Extract<'uid'>> = true;
      use(assertion);
    });

    it('extracts {segment} captures', () => {
      const assertion: SameType<Extract<'{uid}'>, 'uid'> = true;
      use(assertion);
    });

    it('extracts {segment=*} captures', () => {
      const assertion: SameType<Extract<'{uid=*}'>, 'uid'> = true;
      use(assertion);
    });

    it('extracts {segment=**} captures', () => {
      const assertion: SameType<Extract<'{uid=**}'>, 'uid'> = true;
      use(assertion);
    });
  });

  describe('ParamsOf', () => {
    it('falls back to Record<string, string> without better type info', () => {
      const assertion: SameType<
        ParamsOf<string>,
        Record<string, string>
      > = true;
      use(assertion);
    });

    it('is the empty object when there are no params', () => {
      const assertion: SameType<
        ParamsOf<'a/b/c'>,
        Record<string, never>
      > = true;
      use(assertion);
    });

    it('extracts a single param', () => {
      const assertion: SameType<
        ParamsOf<'users/{uid}'>,
        { uid: string }
      > = true;
      use(assertion);
    });

    it('extracts multiple params', () => {
      const assertion: SameType<
        ParamsOf<'users/{uid}/logs/{log=**}'>,
        {
          uid: string;
          log: string;
        }
      > = true;
      use(assertion);
    });
  });
});
