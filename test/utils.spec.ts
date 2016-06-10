/// <reference path="../typings/index.d.ts" />

import {normalizePath, pathParts, valAt, applyChange, tokenToAuthOverrides} from '../src/utils';
import {expect} from 'chai';

describe ('utils', () => {
  describe('.normalizePath(path: string)', () => {
    it('should add leading slash and strip trailing slash', () => {
      expect(normalizePath('my/path/is/{rad}/')).to.eq('/my/path/is/{rad}');
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
      expect(valAt({a: {b: null}}, '/a/b/c')).to.be.null;
    });

    it('should be null if accessing a path past a leaf value', () => {
      expect(valAt({a: 2}, '/a/b')).to.be.null;
    });

    it('should be the leaf value if one is present', () => {
      expect(valAt({a: {b: 23}}, '/a/b')).to.eq(23);
      expect(valAt({a: {b: 23}}, '/a')).to.deep.equal({b: 23});
    });

    it('should be undefined if in unexplored territory', () => {
      expect(valAt({a: 23}, '/b')).to.be.undefined;
    });
  });

  describe('.applyChange(from: any, to: any): any', () => {
    it('should return the to value for non-object values of from and to', () => {
      expect(applyChange({a: 'b'}, null)).to.eq(null);
      expect(applyChange(null, {a: 'b'})).to.deep.equal({a: 'b'});
      expect(applyChange(23, null)).to.be.null;
    });

    it('should return the merged value of two objects', () => {
      let from = {a: {b: 'foo', c: 23, d: 444}, d: {e: 42}};
      let to = {a: {b: 'bar', c: null}, d: null, e: {f: 'g'}};
      let result = {a: {b: 'bar', d: 444}, e: {f: 'g'}};
      expect(applyChange(from, to)).to.deep.equal(result);
    });
  });

  describe('.tokenToAuthOverrides(token: string): Object', () => {
    let encodeToken: (Object) => string = claims => '.' + new Buffer(JSON.stringify(claims)).toString('base64');

    it('should populate uid and token if only sub is available', () => {
      let claims = {
        sub: 'abcdef'
      };

      expect(tokenToAuthOverrides(encodeToken(claims))).to.deep.equal({uid: 'abcdef', provider: 'anonymous', token: claims});
    });

    it('should populate email, email_verified, and name if available', () => {
      let claims = {
        sub: 'abcdef',
        email: 'foo@example.com',
        email_verified: false,
        name: 'Sally User',
        firebase: {
          identities: {'email': ['foo@example.com']}
        }
      };

      expect(tokenToAuthOverrides(encodeToken(claims))).to.deep.equal({
        uid: 'abcdef',
        provider: 'email',
        email: 'foo@example.com',
        email_verified: false,
        name: 'Sally User',
        token: claims
      });
    });

    it('should populate a provider if one is available', () => {
      let claims = {
        sub: 'abcdef',
        email: 'foo@example.com',
        email_verified: false,
        name: 'Sally User',
        firebase: {
          identities: {'google.com': ['abcdef']}
        }
      };

      expect(tokenToAuthOverrides(encodeToken(claims))).to.deep.equal({
        uid: 'abcdef',
        provider: 'google',
        email: 'foo@example.com',
        email_verified: false,
        name: 'Sally User',
        token: claims
      });
    });
  });
});
