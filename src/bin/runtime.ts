#!/usr/bin/env node

import * as express from 'express';

import { ManifestBackend, ManifestEndpoint } from "../common/manifest/v1alpha/backend";
import { loadModule } from "../common/loader";

function extractEndpoints(
    mod,
    endpoints: Record<string, ManifestEndpoint>,
    prefix?: string
) {
  prefix = prefix || '';
  for (const funcName of Object.keys(mod)) {
    const child = mod[funcName];
    if (
        typeof child === 'function' &&
        child.__endpoint &&
        typeof child.__endpoint === 'object'
    ) {
      if (funcName.indexOf('-') >= 0) {
        throw new Error(
            'Function name "' +
            funcName +
            '" is invalid. Function names cannot contain dashes.'
        );
      }
      const name = prefix + funcName;
      endpoints[name] = {
        ...child.__endpoint,
        entryPoint: name.replace(/-/g, '.'),
      };
    } else if (typeof child === 'object' && child !== null) {
      extractEndpoints(child, endpoints, prefix + funcName + '-');
    }
  }
}


async function describeBackend(functionsDir: string): Promise<ManifestBackend> {
  const endpoints: Record<string, ManifestEndpoint> = {};
  const mod = await loadModule(functionsDir);
  extractEndpoints(mod, endpoints);

  const backend: ManifestBackend = { endpoints, specVersion: "v1alpha", requiredAPIs: {} };
  if (Object.values(endpoints).find(ep => ep.scheduleTrigger)) {
    backend.requiredAPIs["pubsub"] = "pubsub.googleapis.com";
    backend.requiredAPIs["scheduler"] = "cloudscheduler.googleapis.com";
  }
  return backend;
}

function printUsage() {
  console.error(
    `
Usage: firebase-functions <functionsDir>

Arguments:
  - functionsDir: Directory containing source code for Firebase Functions.
`
  );
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length != 1) {
  printUsage();
}
const functionsDir = args[0];

const app = express();
app.get('/backend.yaml', async (req, res) => {
  const backend = await describeBackend(functionsDir);
  res.setHeader('content-type', 'text/yaml');
  res.send(JSON.stringify(backend));
});

let port = 8080;
if (process.env.ADMIN_PORT) {
  port = Number.parseInt(process.env.ADMIN_PORT);
}
console.error('Serving at port', port);
app.listen(port);
