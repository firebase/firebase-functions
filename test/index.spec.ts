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
import './cloud/https-builder.spec';
import './cloud/pubsub-builder.spec';
import './cloud/storage-builder.spec';
import './database/builder.spec';
import './database/delta-snapshot.spec';
