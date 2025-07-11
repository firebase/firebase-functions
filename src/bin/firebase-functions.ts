#!/usr/bin/env node

// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as http from "http";
import * as express from "express";
import { loadStack } from "../runtime/loader";
import { stackToWire } from "../runtime/manifest";

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

let functionsDir = ".";

const args = process.argv.slice(2);
if (args.length > 1) {
  if (args[0] === "-h" || args[0] === "--help") {
    printUsageAndExit();
  }
  functionsDir = args[0];
}

const MANIFEST_START_TAG = "<FIREBASE_FUNCTIONS_MANIFEST>";
const MANIFEST_END_TAG = "</FIREBASE_FUNCTIONS_MANIFEST>";
const MANIFEST_ERROR_START_TAG = "<FIREBASE_FUNCTIONS_MANIFEST_ERROR>";
const MANIFEST_ERROR_END_TAG = "</FIREBASE_FUNCTIONS_MANIFEST_ERROR>";

async function runStdioDiscovery() {
  try {
    const stack = await loadStack(functionsDir);
    const wireFormat = stackToWire(stack);
    const manifestJson = JSON.stringify(wireFormat);
    const base64 = Buffer.from(manifestJson).toString("base64");
    process.stderr.write(`${MANIFEST_START_TAG}\n${base64}\n${MANIFEST_END_TAG}\n`);
    process.exitCode = 0;
  } catch (e) {
    console.error("Failed to generate manifest from function source:", e);
    const message = e instanceof Error ? e.message : String(e);
    process.stderr.write(`${MANIFEST_ERROR_START_TAG}\n${message}\n${MANIFEST_ERROR_END_TAG}\n`);
    process.exitCode = 1;
  }
}

function handleQuitquitquit(req: express.Request, res: express.Response, server: http.Server) {
  res.send("ok");
  server.close();
}

if (
  process.env.FUNCTIONS_CONTROL_API === "true" &&
  process.env.FUNCTIONS_DISCOVERY_MODE === "stdio"
) {
  void runStdioDiscovery();
} else {
  let server: http.Server = undefined;
  const app = express();

  app.get("/__/quitquitquit", (req, res) => handleQuitquitquit(req, res, server));
  app.post("/__/quitquitquit", (req, res) => handleQuitquitquit(req, res, server));

  if (process.env.FUNCTIONS_CONTROL_API === "true") {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.get("/__/functions.yaml", async (req, res) => {
      try {
        const stack = await loadStack(functionsDir);
        res.setHeader("content-type", "text/yaml");
        res.send(JSON.stringify(stackToWire(stack)));
      } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        res.status(400).send(`Failed to generate manifest from function source: ${errorMessage}`);
      }
    });
  }

  let port = 8080;
  if (process.env.PORT) {
    port = Number.parseInt(process.env.PORT);
  }

  console.log("Serving at port", port);
  server = app.listen(port);
}
