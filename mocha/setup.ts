import * as chai from "chai";
import * as nock from "nock";
import chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

nock.disableNetConnect();
