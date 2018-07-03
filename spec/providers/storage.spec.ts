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

import * as storage from '../../src/providers/storage';
import { expect } from 'chai';

describe('Storage Functions', () => {
  describe('ObjectBuilder', () => {
    before(() => {
      process.env.FIREBASE_CONFIG = JSON.stringify({
        storageBucket: 'bucket',
      });
    });

    after(() => {
      delete process.env.FIREBASE_CONFIG;
    });

    describe('#onArchive', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        let cloudFunction = storage
          .bucket('bucky')
          .object()
          .onArchive(() => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.archive',
            resource: 'projects/_/buckets/bucky',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should use the default bucket when none is provided', () => {
        let cloudFunction = storage.object().onArchive(() => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.archive',
            resource: 'projects/_/buckets/bucket',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should allow fully qualified bucket names', () => {
        let subjectQualified = new storage.ObjectBuilder(
          () => 'projects/_/buckets/bucky'
        );
        let result = subjectQualified.onArchive(() => null);
        expect(result.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.archive',
            resource: 'projects/_/buckets/bucky',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should throw with improperly formatted buckets', () => {
        expect(
          () =>
            storage
              .bucket('bad/bucket/format')
              .object()
              .onArchive(() => null).__trigger
        ).to.throw(Error);
      });

      it('should not mess with media links using non-literal slashes', () => {
        let cloudFunction = storage.object().onArchive(data => {
          return data.mediaLink;
        });
        let goodMediaLinkEvent = {
          data: {
            mediaLink:
              'https://www.googleapis.com/storage/v1/b/mybucket.appspot.com' +
              '/o/nestedfolder%2Fanotherfolder%2Fmyobject.file?generation=12345&alt=media',
          },
        };
        return cloudFunction(goodMediaLinkEvent).then((result: any) => {
          expect(result).equals(goodMediaLinkEvent.data.mediaLink);
        });
      });
    });

    describe('#onDelete', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        let cloudFunction = storage
          .bucket('bucky')
          .object()
          .onDelete(() => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.delete',
            resource: 'projects/_/buckets/bucky',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should use the default bucket when none is provided', () => {
        let cloudFunction = storage.object().onDelete(() => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.delete',
            resource: 'projects/_/buckets/bucket',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should allow fully qualified bucket names', () => {
        let subjectQualified = new storage.ObjectBuilder(
          () => 'projects/_/buckets/bucky'
        );
        let result = subjectQualified.onDelete(() => null);
        expect(result.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.delete',
            resource: 'projects/_/buckets/bucky',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should throw with improperly formatted buckets', () => {
        expect(
          () =>
            storage
              .bucket('bad/bucket/format')
              .object()
              .onDelete(() => null).__trigger
        ).to.throw(Error);
      });

      it('should not mess with media links using non-literal slashes', () => {
        let cloudFunction = storage.object().onDelete(data => {
          return data.mediaLink;
        });
        let goodMediaLinkEvent = {
          data: {
            mediaLink:
              'https://www.googleapis.com/storage/v1/b/mybucket.appspot.com' +
              '/o/nestedfolder%2Fanotherfolder%2Fmyobject.file?generation=12345&alt=media',
          },
        };
        return cloudFunction(goodMediaLinkEvent).then((result: any) => {
          expect(result).equals(goodMediaLinkEvent.data.mediaLink);
        });
      });
    });

    describe('#onFinalize', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        let cloudFunction = storage
          .bucket('bucky')
          .object()
          .onFinalize(() => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.finalize',
            resource: 'projects/_/buckets/bucky',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should use the default bucket when none is provided', () => {
        let cloudFunction = storage.object().onFinalize(() => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.finalize',
            resource: 'projects/_/buckets/bucket',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should allow fully qualified bucket names', () => {
        let subjectQualified = new storage.ObjectBuilder(
          () => 'projects/_/buckets/bucky'
        );
        let result = subjectQualified.onFinalize(() => null);
        expect(result.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.finalize',
            resource: 'projects/_/buckets/bucky',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should throw with improperly formatted buckets', () => {
        expect(
          () =>
            storage
              .bucket('bad/bucket/format')
              .object()
              .onFinalize(() => null).__trigger
        ).to.throw(Error);
      });

      it('should not mess with media links using non-literal slashes', () => {
        let cloudFunction = storage.object().onFinalize(data => {
          return data.mediaLink;
        });
        let goodMediaLinkEvent = {
          data: {
            mediaLink:
              'https://www.googleapis.com/storage/v1/b/mybucket.appspot.com' +
              '/o/nestedfolder%2Fanotherfolder%2Fmyobject.file?generation=12345&alt=media',
          },
        };
        return cloudFunction(goodMediaLinkEvent).then((result: any) => {
          expect(result).equals(goodMediaLinkEvent.data.mediaLink);
        });
      });
    });

    describe('#onMetadataUpdate', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        let cloudFunction = storage
          .bucket('bucky')
          .object()
          .onMetadataUpdate(() => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.metadataUpdate',
            resource: 'projects/_/buckets/bucky',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should use the default bucket when none is provided', () => {
        let cloudFunction = storage.object().onMetadataUpdate(() => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.metadataUpdate',
            resource: 'projects/_/buckets/bucket',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should allow fully qualified bucket names', () => {
        let subjectQualified = new storage.ObjectBuilder(
          () => 'projects/_/buckets/bucky'
        );
        let result = subjectQualified.onMetadataUpdate(() => null);
        expect(result.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.storage.object.metadataUpdate',
            resource: 'projects/_/buckets/bucky',
            service: 'storage.googleapis.com',
          },
        });
      });

      it('should throw with improperly formatted buckets', () => {
        expect(
          () =>
            storage
              .bucket('bad/bucket/format')
              .object()
              .onMetadataUpdate(() => null).__trigger
        ).to.throw(Error);
      });

      it('should not mess with media links using non-literal slashes', () => {
        let cloudFunction = storage.object().onMetadataUpdate(data => {
          return data.mediaLink;
        });
        let goodMediaLinkEvent = {
          data: {
            mediaLink:
              'https://www.googleapis.com/storage/v1/b/mybucket.appspot.com' +
              '/o/nestedfolder%2Fanotherfolder%2Fmyobject.file?generation=12345&alt=media',
          },
        };
        return cloudFunction(goodMediaLinkEvent).then((result: any) => {
          expect(result).equals(goodMediaLinkEvent.data.mediaLink);
        });
      });
    });
  });

  describe('process.env.FIREBASE_CONFIG not set', () => {
    it('should not throw if __trigger is not accessed', () => {
      expect(() => storage.object().onArchive(() => null)).to.not.throw(Error);
    });

    it('should throw when trigger is accessed', () => {
      expect(() => storage.object().onArchive(() => null).__trigger).to.throw(
        Error
      );
    });

    it('should not throw when #run is called', () => {
      let cf = storage.object().onArchive(() => null);
      expect(cf.run).to.not.throw(Error);
    });
  });
});
