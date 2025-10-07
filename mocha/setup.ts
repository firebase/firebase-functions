import * as chai from "chai";
import * as chaiAsPromisedModule from "chai-as-promised";
import * as nockModule from "nock";

// Normalize CommonJS exports so ts-node (Node.js 20) and Node.js 22's strip-only loader
// both receive callable modules without relying on esModuleInterop.
type ChaiPlugin = Parameters<typeof chai.use>[0];
type NockModule = typeof nockModule;

const chaiAsPromisedExport = chaiAsPromisedModule as ChaiPlugin & { default?: ChaiPlugin };
const chaiAsPromised = chaiAsPromisedExport.default ?? chaiAsPromisedExport;
const nockExport = nockModule as NockModule & { default?: NockModule };
const nock = nockExport.default ?? nockExport;

chai.use(chaiAsPromised);

nock.disableNetConnect();
