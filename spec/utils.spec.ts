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

import { normalizePath, pathParts, valAt, applyChange } from '../src/utils';
import { expect } from 'chai';

describe('utils', () => {
  describe('.normalizePath(path: string)', () => {
    it('should strip leading and trailing slash', () => {
      expect(normalizePath('/my/path/is/{rad}/')).to.eq('my/path/is/{rad}');
    });
  });

  describe('.pathParts(path: string): string[]', () => {
    it('should turn a path into an array of strings', () => {
      expect(pathParts('/foo/bar/baz')).to.deep.equal(['foo', 'bar', 'baz']);
    });

    it('should turn a root path, empty string, or null path into an empty array', () => {
      expect(pathParts('')).to.deep.equal([]);
      expect(pathParts(null)).to.deep.equal([]);
      expect(pathParts('/')).to.deep.equal([]);
    });
  });

  describe('.valAt(source: any, path?: string): any', () => {
    it('should be null if null along any point in the path', () => {
      expect(valAt(null)).to.be.null;
      expect(valAt(null, '/foo')).to.be.null;
      expect(valAt({ a: { b: null } }, '/a/b/c')).to.be.null;
    });

    it('should be null if accessing a path past a leaf value', () => {
      expect(valAt({ a: 2 }, '/a/b')).to.be.null;
    });

    it('should be the leaf value if one is present', () => {
      expect(valAt({ a: { b: 23 } }, '/a/b')).to.eq(23);
      expect(valAt({ a: { b: 23 } }, '/a')).to.deep.equal({ b: 23 });
    });

    it('should be undefined if in unexplored territory', () => {
      expect(valAt({ a: 23 }, '/b')).to.be.undefined;
    });
  });

  describe('.applyChange(from: any, to: any): any', () => {
    it('should return the to value for non-object values of from and to', () => {
      expect(applyChange({ a: 'b' }, null)).to.eq(null);
      expect(applyChange(null, { a: 'b' })).to.deep.equal({ a: 'b' });
      expect(applyChange(23, null)).to.be.null;
    });

    it('should return the merged value of two objects', () => {
      let from = { a: { b: 'foo', c: 23, d: 444 }, d: { e: 42 } };
      let to: any = { a: { b: 'bar', c: null }, d: null, e: { f: 'g' } };
      let result = { a: { b: 'bar', d: 444 }, e: { f: 'g' } };
      expect(applyChange(from, to)).to.deep.equal(result);
    });
  });
});
