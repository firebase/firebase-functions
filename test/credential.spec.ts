'use strict';

// Use untyped import syntax for Node built-ins
import fs = require('fs');
import path = require('path');
import { expect } from 'chai';
import * as sinon from 'sinon';
import { mockCreateToken, mockRefreshToken, mockMetadataServiceToken } from './fixtures/http';

import {
  ApplicationDefaultCredential, CertCredential, Certificate, MetadataServiceCredential,
  RefreshToken, RefreshTokenCredential, UnauthenticatedCredential,
} from '../src/credential';

let TEST_CERTIFICATE_OBJECT;
try {
  const certPath = path.resolve(__dirname, 'fixtures/credential/key.json');
  TEST_CERTIFICATE_OBJECT = JSON.parse(fs.readFileSync(certPath).toString());
} catch (error) {
  throw new Error('key.json not found. Have you added a key.json file to your resources yet?');
}

const TEST_GCLOUD_CREDENTIALS = {
  client_id: 'some.apps.googleusercontent.com',
  client_secret: 'shhhhhhh!',
  refresh_token: 'veryFresh',
  type: 'authorized_user',
};

const ONE_HOUR_IN_SECONDS = 60 * 60;

describe('Credential', () => {
  describe('Certificate', () => {
    describe('fromPath', () => {
      it('should throw if called with no argument', () => {
        expect(() => {
          // Need to remove type information to even compile this.
          let untypedFactory: any = Certificate.fromPath;
          untypedFactory();
        }).to.throw(Error);
      });

      it('should throw if service account points to an invalid path', () => {
        expect(() => Certificate.fromPath('invalid-file')).to.throw(Error);
      });

      it('should throw if called with the path to an invalid file', () => {
        const invalidPath = path.resolve(__dirname, 'fixtures/credential/unparesable.key.json');
        expect(() => Certificate.fromPath(invalidPath)).to.throw(Error);
      });

      it('should throw if service account is an empty string', () => {
        expect(() => Certificate.fromPath('')).to.throw(Error);
      });

      it('should not throw given a valid path to a service account', () => {
        const validPath = path.resolve(__dirname, 'fixtures/credential/key.json');
        expect(() => Certificate.fromPath(validPath)).not.to.throw();
      });
    });

    describe('constructor', () => {
      it('should throw if service account does not contain a valid "client_email"', () => {
        expect(() => {
          return new Certificate({
            client_email: '',
            private_key: TEST_CERTIFICATE_OBJECT.private_key,
          });
        }).to.throw(Error);

        expect(() => {
          return new Certificate({
            private_key: TEST_CERTIFICATE_OBJECT.private_key,
          });
        }).to.throw(Error);
      });

      it('should throw if service account does not contain a valid "private_key"', () => {
        expect(() => {
          return new Certificate({
            client_email: TEST_CERTIFICATE_OBJECT.client_email,
            private_key: '',
          });
        }).to.throw(Error);

        expect(() => {
          return new Certificate({
            client_email: TEST_CERTIFICATE_OBJECT.client_email,
          });
        }).to.throw(Error);
      });

      it('should not throw given a valid service account object', () => {
        expect(() => {
          return new Certificate({
            private_key: TEST_CERTIFICATE_OBJECT.private_key,
            client_email: TEST_CERTIFICATE_OBJECT.client_email,
          });
        }).not.to.throw();
      });

      it('should accept "clientEmail" in place of "client_email" for the service account', () => {
        expect(() => {
          return new Certificate({
            private_key: TEST_CERTIFICATE_OBJECT.private_key,
            clientEmail: TEST_CERTIFICATE_OBJECT.client_email,
          });
        }).not.to.throw();
      });

      it('should accept "privateKey" in place of "private_key" for the service account', () => {
        expect(() => {
          return new Certificate({
            privateKey: TEST_CERTIFICATE_OBJECT.private_key,
            client_email: TEST_CERTIFICATE_OBJECT.client_email,
          });
        }).not.to.throw();
      });
    });

  });

  describe('CertCredential', () => {
    it('should return a Credential', () => {
      const c = new CertCredential(new Certificate(TEST_CERTIFICATE_OBJECT));
      expect(c.getCertificate()).to.deep.equal({
        projectId: TEST_CERTIFICATE_OBJECT.project_id,
        clientEmail: TEST_CERTIFICATE_OBJECT.client_email,
        privateKey: TEST_CERTIFICATE_OBJECT.private_key,
      });
    });

    it('should create access tokens and cache the response', () => {
      const c = new CertCredential(new Certificate(TEST_CERTIFICATE_OBJECT));
      mockCreateToken();
      return c.getAccessToken().then(token => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.equal(ONE_HOUR_IN_SECONDS);
        return c.getAccessToken().then(newToken => {
          expect(newToken).to.equal(token);
        });
      });
    });
  });

  describe('UnauthenticatedCredential', () => {
    it('should not return a service account', () => {
      const c = new UnauthenticatedCredential();
      expect(c.getCertificate()).to.be.null;
    });

    it('should resolve null for access tokens', () => {
      const c = new UnauthenticatedCredential();
      return c.getAccessToken().then((token) => expect(token).to.be.null);
    });
  });

  describe('RefreshTokenCredential', () => {
    it('should not return a service account', () => {
      const c = new RefreshTokenCredential(new RefreshToken(TEST_GCLOUD_CREDENTIALS));
      expect(c.getCertificate()).to.be.null;
    });

    it('should create access tokens and cache the response', () => {
      const c = new RefreshTokenCredential(new RefreshToken(TEST_GCLOUD_CREDENTIALS));
      mockRefreshToken();
      return c.getAccessToken().then(token => {
        expect(token.access_token).to.be.a('string').and.to.not.be.empty;
        expect(token.expires_in).to.equal(ONE_HOUR_IN_SECONDS);
        return c.getAccessToken().then(newToken => {
          expect(newToken).to.equal(token);
        });
      });
    });
  });

  describe('MetadataServiceCredential', () => {
    it('should not return a service account', () => {
      const c = new MetadataServiceCredential();
      expect(c.getCertificate()).to.be.null;
    });

    it('should create access tokens and cache the response', () => {
      mockMetadataServiceToken({
        access_token: 'anAccessToken',
        expires_in: 900,
      });

      const c = new MetadataServiceCredential();
      return c.getAccessToken().then(function(token) {
        expect(token.access_token).to.equal('anAccessToken');
        expect(token.expires_in).to.equal(900);
        return c.getAccessToken().then(newToken => {
          expect(newToken).to.equal(token);
        });
      });
    });
  });

  describe('ApplicationDefaultCredential', () => {
    let credPath: string;
    let fsStub;

    beforeEach(()  => credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS);

    afterEach(() => {
      if (fsStub) {
        fsStub.restore();
      }
      process.env.GOOGLE_APPLICATION_CREDENTIALS = this.credPath;
    });

    it('should return a CertCredential with GOOGLE_APPLICATION_CREDENTIALS set', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, './fixtures/credential/key.json');
      const c = new ApplicationDefaultCredential();
      expect(c.getCredential()).to.be.an.instanceof(CertCredential);
    });

    it('should throw if explicitly pointing to an invalid path', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = 'invalidpath';
      expect(() => new ApplicationDefaultCredential()).to.throw(Error);
    });

    it('should throw if explicitly pointing to an invalid cert file', () => {
      fsStub = sinon.stub(fs, 'readFileSync').returns('invalidjson');
      expect(() => new ApplicationDefaultCredential()).to.throw(Error);
    });

    it('should return a RefreshTokenCredential with gcloud login', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      fsStub = sinon.stub(fs, 'readFileSync').returns(JSON.stringify(TEST_GCLOUD_CREDENTIALS));
      expect((new ApplicationDefaultCredential()).getCredential()).to.be.an.instanceof(RefreshTokenCredential);
    });

    it('should throw if a the gcloud login cache is invalid', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      fsStub = sinon.stub(fs, 'readFileSync').returns('invalidjson');
      expect(() => new ApplicationDefaultCredential()).to.throw(Error);
    });

    it('should return a MetadataServiceCredential as a last resort', () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      fsStub = sinon.stub(fs, 'readFileSync').throws(new Error('no gcloud credential file'));
      expect((new ApplicationDefaultCredential()).getCredential()).to.be.an.instanceof(MetadataServiceCredential);
    });
  });
});
