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

async function handleQuitquitquit(req: express.Request, res: express.Response) {
  res.send('ok');
  server.close(() => console.log('shutdown requested via /__/quitquitquit'));
}

app.get('/__/quitquitquit', handleQuitquitquit);
app.post('/__/quitquitquit', handleQuitquitquit);

if (process.env.FUNCTIONS_CONTROL_API === 'true') {
  app.get('/__/functions.yaml', async (req, res) => {
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
}

let port = 8080;
if (process.env.PORT) {
  port = Number.parseInt(process.env.PORT);
}

console.log('Serving at port', port);
server = app.listen(port);
