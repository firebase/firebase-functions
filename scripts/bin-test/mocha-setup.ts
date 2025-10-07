import * as chai from "chai";
import * as chaiAsPromisedModule from "chai-as-promised";

// Match the runtime shim in mocha/setup.ts so bin tests work on Node.js 20 ts-node
// and Node.js 22's strip-only TypeScript loader without enabling esModuleInterop.
type ChaiPlugin = Parameters<typeof chai.use>[0];

const chaiAsPromisedExport = chaiAsPromisedModule as ChaiPlugin & { default?: ChaiPlugin };
const chaiAsPromised = chaiAsPromisedExport.default ?? chaiAsPromisedExport;

chai.use(chaiAsPromised);
