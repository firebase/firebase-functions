#!/usr/bin/env node

import * as express from 'express';
import { loadStack } from '../runtime/loader';

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

let server;
const app = express();

app.get('/stack.yaml', async (req, res) => {
  try {
    const backend = await loadStack(functionsDir);
    res.setHeader('content-type', 'text/yaml');
    res.send(JSON.stringify(backend));
  } catch (e) {
    res
      .status(400)
      .send(`Failed to generate manifest from function source: ${e}`);
  }
});

app.get('/__/quitquitquit', async (req, res) => {
  res.send('ok');
  server.close(() => console.log('shutdown requested via /quitquitquit'));
});

let port = 8080;
if (process.env.STACK_CONTROL_API_PORT) {
  port = Number.parseInt(process.env.STACK_CONTROL_API_PORT);
}

console.log('Serving at port', port);
server = app.listen(port);
