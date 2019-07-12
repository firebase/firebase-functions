import { expect } from 'chai';
import { normalizePath, pathParts } from '../../src/utilities/path';

describe('utilities', () => {
  describe('path', () => {
    describe('#normalizePath', () => {
      it('should strip leading and trailing slash', () => {
        expect(normalizePath('/my/path/is/{rad}/')).to.eq('my/path/is/{rad}');
      });
    });

    describe('#pathParts', () => {
      it('should turn a path into an array of strings', () => {
        expect(pathParts('/foo/bar/baz')).to.deep.equal(['foo', 'bar', 'baz']);
      });

      it('should turn a root path, empty string, or null path into an empty array', () => {
        expect(pathParts('')).to.deep.equal([]);
        expect(pathParts(null)).to.deep.equal([]);
        expect(pathParts('/')).to.deep.equal([]);
      });
    });
  });
});
