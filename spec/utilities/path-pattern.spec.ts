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
import * as pathPattern from '../../src/utilities/path-pattern';

describe('path-pattern', () => {
  describe('compile', () => {
    it('should throw on an empty expression', () => {
      expect(
        () => pathPattern.PathPattern.compile('/projects//buckets/bucket-1/objects/file1.txt')
      ).to.throw('A segment cannot be empty.');
    });

    it('should throw on multiple * in an expression', () => {
      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/bucket**/objects/file1.txt')
      ).to.throw('A segment cannot be empty.');

      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/bucket-1/objects/file-*.*')
      ).to.throw('A segment cannot be empty.');
    });

    it('should throw on multiple ** in a path', () => {
      expect(
        () => pathPattern.PathPattern.compile('/projects/**/buckets/**')
      ).to.throw('A segment cannot be empty.');
    });

    it('should throw on missing ID', () => {
      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/{=*}/objects/file1.txt')
      ).to.throw('A segment cannot be empty.');
    });

    it('should throw on empty expression', () => {
      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/{bucket=}/objects/file1.txt')
      ).to.throw('A segment cannot be empty.');
    });

    it('should throw on unclosed capture', () => {
      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/{bucket/objects/file1.txt')
      ).to.throw('A segment cannot be empty.');
    });

    it('should not throw on correct path patterns', () => {
      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/bucket-1/objects/file1.txt')
      ).to.not.throw;

      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/bucket-1/objects/*')
      ).to.not.throw;

      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/bucket-1/objects/*.txt')
      ).to.not.throw;

      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/bucket-1/objects/file-*.txt')
      ).to.not.throw;

      expect(
        () => pathPattern.PathPattern.compile('/projects/_/**/file-*.txt')
      ).to.not.throw;

      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/bucket-*/objects/file-*.txt')
      ).to.not.throw;

      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/{bucket}/objects/file.*')
      ).to.not.throw;

      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/{bucket=*}/objects/file.*')
      ).to.not.throw;

      expect(
        () => pathPattern.PathPattern.compile('/projects/_/buckets/*/objects/{filename=file.*}')
      ).to.not.throw;
    });
  });

  describe('trimParam', () => {
    it('should trim a capture param without equals', () => {
      expect(pathPattern.trimParam('{something}')).to.equal('something');
    });

    it('should trim a capture param with equals', () => {
      expect(pathPattern.trimParam('{something=*}')).to.equal('something');
    });
  });

  describe('extractMatches', () => {
    it('should parse without multi segment', () => {
      const pp = new pathPattern.PathPattern('{a}/something/else/{b}/end/{c}');

      expect(
        pp.extractMatches('match_a/something/else/match_b/end/match_c')
      ).to.deep.equal({
        a: 'match_a',
        b: 'match_b',
        c: 'match_c',
      });
    });

    it('should parse multi segment with params after', () => {
      const pp = new pathPattern.PathPattern(
        'something/**/else/{a}/hello/{b}/world'
      );

      expect(
        pp.extractMatches('something/is/a/thing/else/nothing/hello/user/world')
      ).to.deep.equal({
        a: 'nothing',
        b: 'user',
      });
    });

    it('should parse multi segment param with params after', () => {
      const pp = new pathPattern.PathPattern(
        'something/{path=**}/else/{a}/hello/{b}/world'
      );

      expect(
        pp.extractMatches('something/is/a/thing/else/nothing/hello/user/world')
      ).to.deep.equal({
        path: 'is/a/thing',
        a: 'nothing',
        b: 'user',
      });
    });

    it('should parse multi segment with params before', () => {
      const pp = new pathPattern.PathPattern('{a}/something/{b}/**/end');

      expect(
        pp.extractMatches(
          'match_a/something/match_b/thing/else/nothing/hello/user/end'
        )
      ).to.deep.equal({
        a: 'match_a',
        b: 'match_b',
      });
    });

    it('should parse multi segment param with params before', () => {
      const pp = new pathPattern.PathPattern('{a}/something/{b}/{path=**}/end');

      expect(
        pp.extractMatches(
          'match_a/something/match_b/thing/else/nothing/hello/user/end'
        )
      ).to.deep.equal({
        a: 'match_a',
        b: 'match_b',
        path: 'thing/else/nothing/hello/user',
      });
    });

    it('should parse multi segment with params before and after', () => {
      const pp = new pathPattern.PathPattern('{a}/something/**/{b}/end');

      expect(
        pp.extractMatches(
          'match_a/something/thing/else/nothing/hello/user/match_b/end'
        )
      ).to.deep.equal({
        a: 'match_a',
        b: 'match_b',
      });
    });

    it('should parse multi segment param with params before', () => {
      const pp = new pathPattern.PathPattern('{a}/something/{path=**}/{b}/end');

      expect(
        pp.extractMatches(
          'match_a/something/thing/else/nothing/hello/user/match_b/end'
        )
      ).to.deep.equal({
        a: 'match_a',
        b: 'match_b',
        path: 'thing/else/nothing/hello/user',
      });
    });

    // handle an instance param
    it('should parse an instance', () => {
      const pp = new pathPattern.PathPattern('{a}-something-{b}-else-{c}');

      expect(
        pp.extractMatches('match_a-something-match_b-else-match_c')
      ).to.deep.equal({});

      const anotherPP = new pathPattern.PathPattern('{a}');

      expect(anotherPP.extractMatches('match_a')).to.deep.equal({
        a: 'match_a',
      });
    });
  });
});
