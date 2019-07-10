import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as nock from 'nock';

chai.use(chaiAsPromised);

nock.disableNetConnect();
