import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

import * as nock from 'nock';
nock.disableNetConnect();

import 'mocha';
import './utils.spec';
import './apps.spec';
import './builder.spec';
import './env.spec';
import './event.spec';
import './credential.spec';
import './builders/auth-builder.spec';
import './builders/https-builder.spec';
import './builders/pubsub-builder.spec';
import './builders/storage-builder.spec';
import './builders/database-builder.spec';
import './database/delta-snapshot.spec';
