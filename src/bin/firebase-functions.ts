#!/usr/bin/env node

import * as express from 'express';
import { loadStack } from '../runtime/loader';

function printUsageAndExit() {
  console.error(
    `
Usage: firebase-functions [functionsDir]

Arguments:
  - functionsDir: Directory containing source code for Firebase Functions.
`
  );
  process.exit(1);
}

let functionsDir = '.';

const args = process.argv.slice(2);
if (args.length > 1) {
  if (args[0] === '-h' || args[0] === '--help') {
    printUsageAndExit();
  }
  functionsDir = args[0];
}

let server;
const app = express();

app.get('/stack.yaml', async (req, res) => {
  try {
    const stack = await loadStack(functionsDir);
    res.setHeader('content-type', 'text/yaml');
    res.send(JSON.stringify(stack));
  } catch (e) {
    res
      .status(400)
      .send(`Failed to generate manifest from function source: ${e}`);
  }
});

app.get('/__/quitquitquit', async (req, res) => {
  res.send('ok');
  server.close(() => console.log('shutdown requested via /__/quitquitquit'));
});

let port = 8080;
if (process.env.STACK_CONTROL_API_PORT) {
  port = Number.parseInt(process.env.STACK_CONTROL_API_PORT);
}

console.log('Serving at port', port);
server = app.listen(port);
