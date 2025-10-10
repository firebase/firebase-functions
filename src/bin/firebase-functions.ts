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
import * as fs from "fs/promises";
import * as path from "path";
import * as express from "express";
import { loadStack } from "../runtime/loader";
import { ManifestEndpoint, stackToWire } from "../runtime/manifest";
import type { FrameworkOptions } from "@google-cloud/functions-framework/build/src/options";
import type { SignatureType } from "@google-cloud/functions-framework/build/src/types";

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
if (args.length >= 1) {
  if (args[0] === "-h" || args[0] === "--help") {
    printUsageAndExit();
  }
  functionsDir = args[0];
}

function handleQuitquitquit(req: express.Request, res: express.Response, server: http.Server) {
  res.send("ok");
  server.close();
}

// The Functions Framework only exports its public surface (http/cloudEvent helpers).
// We still need the internal Express factory (`getServer`) and crash handler for parity,
// so resolve the installed package entry and reach into its compiled sources directly.
// This deliberately leans on the current package layout; future refactors should replace
// it with an officially supported API once one exists.
const FUNCTIONS_FRAMEWORK_ENTRY = require.resolve("@google-cloud/functions-framework");
const FUNCTIONS_FRAMEWORK_DIR = path.dirname(FUNCTIONS_FRAMEWORK_ENTRY);

function loadFrameworkModule<T>(relative: string): T {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(path.join(FUNCTIONS_FRAMEWORK_DIR, relative)) as T;
}

const { getServer } = loadFrameworkModule<
  typeof import("@google-cloud/functions-framework/build/src/server")
>("server.js");

const { ErrorHandler } = loadFrameworkModule<
  typeof import("@google-cloud/functions-framework/build/src/invoker")
>("invoker.js");

type FunctionSignature = SignatureType;

interface RoutedFunction {
  name: string;
  endpoint: ManifestEndpoint;
  handler: (...args: unknown[]) => unknown;
  signature: FunctionSignature;
}

function determineSignature(endpoint: ManifestEndpoint): FunctionSignature {
  if (endpoint.eventTrigger) {
    const platform = endpoint.platform ?? "";
    if (platform === "gcfv2") {
      return "cloudevent";
    }
    return "event";
  }
  return "http";
}

function buildSubApp(
  handler: (...args: unknown[]) => unknown,
  signature: SignatureType,
  baseOptions: Omit<FrameworkOptions, "signatureType">
): express.Application {
  const serverOptions: FrameworkOptions = {
    ...baseOptions,
    signatureType: signature,
  };
  const server = getServer(handler as (...args: unknown[]) => unknown, serverOptions);
  const listener = server.listeners("request")[0];
  if (!listener) {
    server.close();
    throw new Error(`Failed to create Express app for signature type '${signature}'.`);
  }
  server.removeAllListeners();
  server.close();
  return listener as express.Application;
}

if (process.env.FUNCTIONS_MANIFEST_OUTPUT_PATH) {
  void (async () => {
    const outputPath = process.env.FUNCTIONS_MANIFEST_OUTPUT_PATH;
    try {
      // Validate the output path
      const dir = path.dirname(outputPath);
      try {
        await fs.access(dir, fs.constants.W_OK);
      } catch (e) {
        console.error(
          `Error: Cannot write to directory '${dir}': ${e instanceof Error ? e.message : String(e)}`
        );
        console.error("Please ensure the directory exists and you have write permissions.");
        process.exit(1);
      }

      const { stack } = await loadStack(functionsDir);
      const wireFormat = stackToWire(stack);
      await fs.writeFile(outputPath, JSON.stringify(wireFormat, null, 2));
      process.exit(0);
    } catch (e: any) {
      if (e.code === "ENOENT") {
        console.error(`Error: Directory '${path.dirname(outputPath)}' does not exist.`);
        console.error("Please create the directory or specify a valid path.");
      } else if (e.code === "EACCES") {
        console.error(`Error: Permission denied writing to '${outputPath}'.`);
        console.error("Please check file permissions or choose a different location.");
      } else if (e.message?.includes("Failed to generate manifest")) {
        console.error(e.message);
      } else {
        console.error(
          `Failed to generate manifest from function source: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
      if (e instanceof Error && e.stack) {
        console.error(e.stack);
      }
      process.exit(1);
    }
  })();
} else {
  let server: http.Server | undefined;

  const app = express();

  app.get("/__/quitquitquit", (req, res) => handleQuitquitquit(req, res, server));
  app.post("/__/quitquitquit", (req, res) => handleQuitquitquit(req, res, server));

  if (process.env.FUNCTIONS_CONTROL_API === "true") {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.get("/__/functions.yaml", async (_req, res) => {
      try {
        const latest = await loadStack(functionsDir);
        res.setHeader("content-type", "application/json");
        res.send(JSON.stringify(stackToWire(latest.stack)));
      } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        res.status(400).send(`Failed to generate manifest from function source: ${errorMessage}`);
      }
    });
  }

  void (async () => {
    try {
      const latestLoaded = await loadStack(functionsDir);

      const baseOptions: Omit<FrameworkOptions, "signatureType"> = {
        port: "0",
        target: "",
        sourceLocation: path.resolve(functionsDir),
        printHelp: false,
        enableExecutionId: false,
        timeoutMilliseconds: 0,
        ignoredRoutes: null,
      };

      const routed: RoutedFunction[] = [];

      if (process.env.DEBUG_FUNCTION_ROUTER === "1") {
        console.error(
          "Function router discovered handlers:",
          Object.keys(latestLoaded.handlers)
        );
        console.error(
          "Function router stack endpoints:",
          Object.keys(latestLoaded.stack.endpoints)
        );
      }
      for (const [name, handler] of Object.entries(latestLoaded.handlers)) {
        const endpoint = latestLoaded.stack.endpoints[name];
        if (!endpoint) {
          console.warn(`Skipping handler '${name}' because no manifest endpoint was found.`);
          continue;
        }
        routed.push({
          name,
          endpoint,
          handler,
          signature: determineSignature(endpoint),
        });
      }

      const routes: Array<{ name: string; signature: FunctionSignature; path: string }> = [];
      const collisions = new Map<string, string[]>();

      for (const fn of routed) {
        if (process.env.DEBUG_FUNCTION_ROUTER === "1") {
          console.error(`Mounting ${fn.name} with signature ${fn.signature} (type=${typeof fn.handler})`);
        }
        const mountPath = `/${fn.name}`;
        const subApp = buildSubApp(fn.handler, fn.signature, baseOptions);
        app.use(mountPath, subApp);
        routes.push({ name: fn.name, signature: fn.signature, path: mountPath });
        const registered = collisions.get(mountPath) ?? [];
        registered.push(fn.name);
        collisions.set(mountPath, registered);
      }

      for (const [pathName, names] of collisions.entries()) {
        if (names.length > 1) {
          console.warn(
            `Route collision at '${pathName}': functions [${names.join(
              ", "
            )}] share the same mount point.`
          );
        }
      }

      if (!routes.length) {
        console.warn("No functions discovered for routing.");
      }

      const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 8080;

      server = http.createServer(app);
      server.setTimeout(0);
      new ErrorHandler(server).register();

      server.listen(port, () => {
        console.log(`Serving at port ${port}`);
        if (routes.length) {
          console.log("Function routes:");
          for (const route of routes) {
            console.log(`  [${route.signature}] ${route.name} -> ${route.path}`);
          }
        }
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`Failed to initialize function router: ${message}`);
      if (e instanceof Error && e.stack) {
        console.error(e.stack);
      }
      process.exit(1);
    }
  })();
}
