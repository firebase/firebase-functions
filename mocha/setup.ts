import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import nock from "nock";

chai.use(chaiAsPromised);
nock.disableNetConnect();