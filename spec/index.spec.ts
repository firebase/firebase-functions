import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

import * as nock from 'nock';
nock.disableNetConnect();

import 'mocha';
import './utils.spec';
import './apps.spec';
import './env.spec';
import './event.spec';
import './testing.spec';
import './providers/auth.spec';
import './providers/base.spec';
import './providers/https.spec';
import './providers/pubsub.spec';
import './providers/storage.spec';
import './providers/database.spec';
