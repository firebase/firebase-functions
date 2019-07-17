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

import { expect } from 'chai';
import { applyChange } from '../src/utils';

describe('utils', () => {
  describe('.applyChange(from: any, to: any): any', () => {
    it('should return the to value for non-object values of from and to', () => {
      expect(applyChange({ a: 'b' }, null)).to.eq(null);
      expect(applyChange(null, { a: 'b' })).to.deep.equal({ a: 'b' });
      expect(applyChange(23, null)).to.be.null;
    });

    it('should return the merged value of two objects', () => {
      const from = { a: { b: 'foo', c: 23, d: 444 }, d: { e: 42 } };
      const to: any = { a: { b: 'bar', c: null }, d: null, e: { f: 'g' } };
      const result = { a: { b: 'bar', d: 444 }, e: { f: 'g' } };
      expect(applyChange(from, to)).to.deep.equal(result);
    });
  });
});
