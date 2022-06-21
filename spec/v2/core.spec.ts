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

import { expect } from 'chai';
import { Change } from '../../src/v2/core';

describe('Change', () => {
  describe('applyFieldMask', () => {
    const after = {
      foo: 'bar',
      num: 2,
      obj: {
        a: 1,
        b: 2,
      },
    };

    it('should handle deleted values', () => {
      const sparseBefore = { baz: 'qux' };
      const fieldMask = 'baz';
      expect(
        Change.applyFieldMask(sparseBefore, after, fieldMask)
      ).to.deep.equal({
        foo: 'bar',
        num: 2,
        obj: {
          a: 1,
          b: 2,
        },
        baz: 'qux',
      });
    });

    it('should handle created values', () => {
      const sparseBefore = {};
      const fieldMask = 'num,obj.a';
      expect(
        Change.applyFieldMask(sparseBefore, after, fieldMask)
      ).to.deep.equal({
        foo: 'bar',
        obj: {
          b: 2,
        },
      });
    });

    it('should handle mutated values', () => {
      const sparseBefore = {
        num: 3,
        obj: {
          a: 3,
        },
      };
      const fieldMask = 'num,obj.a';
      expect(
        Change.applyFieldMask(sparseBefore, after, fieldMask)
      ).to.deep.equal({
        foo: 'bar',
        num: 3,
        obj: {
          a: 3,
          b: 2,
        },
      });
    });
  });

  describe('fromJSON', () => {
    it('should create a Change object with a `before` and `after`', () => {
      const created = Change.fromJSON<any>({
        before: { foo: 'bar' },
        after: { foo: 'faz' },
      });
      expect(created instanceof Change).to.equal(true);
      expect(created.before).to.deep.equal({ foo: 'bar' });
      expect(created.after).to.deep.equal({ foo: 'faz' });
    });

    it('should apply the customizer function to `before` and `after`', () => {
      function customizer<T>(input: any) {
        input.another = 'value';
        // _.set(input, 'another', 'value');
        return input as T;
      }
      const created = Change.fromJSON<object>(
        {
          before: { foo: 'bar' },
          after: { foo: 'faz' },
        },
        customizer
      );
      expect(created.before).to.deep.equal({
        foo: 'bar',
        another: 'value',
      });
      expect(created.after).to.deep.equal({
        foo: 'faz',
        another: 'value',
      });
    });
  });
});
