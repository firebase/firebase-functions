import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import express from "express";
import fs from "fs";
import type { GraphQLResolveInfo } from "graphql";
import { HttpsFunction, HttpsOptions } from "../https";
import * as options from "../../options";
import { wrapTraceContext } from "../../trace";
import { withInit } from "../../../common/onInit";
import { withErrorHandler, Request } from "../../../common/providers/https";
import { convertIfPresent, convertInvoker } from "../../../common/encoding";
import { initV2Endpoint, ManifestEndpoint } from "../../../runtime/manifest";

const FIREBASE_AUTH_HEADER = "X-Firebase-Auth-Token";
const PRELUDE_GQL = [
  "scalar UUID",
  "scalar Int64",
  "scalar Any",
  "scalar Void",
  "scalar True",
  "scalar Date",
  "scalar Timestamp",
].join("\n");

/** @hidden */
export async function initGraphqlServer(opts: GraphqlServerOptions): Promise<express.Express> {
  if ((!opts.schema && !opts.schemaFilePath) || (opts.schema && opts.schemaFilePath)) {
    throw new Error("Exactly one of 'schema' or 'schemaFilePath' must be provided.");
  }
  if (opts.schemaFilePath) {
    opts.schema = fs.readFileSync(opts.schemaFilePath, "utf-8");
  }
  const schemaWithPrelude = PRELUDE_GQL + "\n" + opts.schema;
  if (!opts.resolvers.query && !opts.resolvers.mutation) {
    throw new Error("At least one query or mutation resolver must be provided.");
  }
  const apolloResolvers: Record<string, any> = {};
  if (opts.resolvers.query) {
    apolloResolvers.Query = opts.resolvers.query;
  }
  if (opts.resolvers.mutation) {
    apolloResolvers.Mutation = opts.resolvers.mutation;
  }
  try {
    const serverPromise = (async () => {
      const app = express();
      const server = new ApolloServer<FirebaseContext>({
        typeDefs: schemaWithPrelude,
        resolvers: apolloResolvers,
      });
      await server.start();
      app.use(
        `/${opts.path ?? "graphql"}`,
        express.json(),
        expressMiddleware(server, {
          context: ({ req }) =>
            Promise.resolve({
              auth: {
                token: req.header(FIREBASE_AUTH_HEADER),
              },
            }),
        })
      );
      return app;
    })();
    return serverPromise;
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new Error("Error initializing GraphQL server: " + e.message);
    } else {
      throw e;
    }
  }
}

/**
 * @hidden
 * Handles HTTPS GraphQL requests.
 * @param {GraphqlServerOptions} opts - Options for configuring the GraphQL server.
 * @returns {HttpsFunction} A function you can export and deploy.
 */
export function onGraphRequest(opts: GraphqlServerOptions): HttpsFunction {
  let serverPromise: Promise<express.Express> | null = null;
  const handler: (req: Request, res: express.Response) => void | Promise<void> = wrapTraceContext(
    withInit(
      withErrorHandler(async (req: Request, res: express.Response) => {
        serverPromise = serverPromise ?? initGraphqlServer(opts);
        const app = await serverPromise;
        app(req, res);
      })
    )
  );

  const globalOpts = options.getGlobalOptions();
  const baseOpts = options.optionsToEndpoint(globalOpts);
  // global options calls region a scalar and https allows it to be an array,
  // but optionsToTriggerAnnotations handles both cases.
  const specificOpts = options.optionsToEndpoint(opts as options.GlobalOptions);
  const endpoint: Partial<ManifestEndpoint> = {
    ...initV2Endpoint(globalOpts, opts),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    dataConnectGraphqlTrigger: {},
  };
  convertIfPresent(
    endpoint.dataConnectGraphqlTrigger,
    globalOpts,
    "invoker",
    "invoker",
    convertInvoker
  );
  convertIfPresent(endpoint.dataConnectGraphqlTrigger, opts, "invoker", "invoker", convertInvoker);
  if (opts.schemaFilePath) {
    endpoint.dataConnectGraphqlTrigger.schemaFilePath = opts.schemaFilePath;
  }
  (handler as HttpsFunction).__endpoint = endpoint;

  return handler as HttpsFunction;
}

/**
 * @hidden
 * Options for configuring the GraphQL server.
 */
export interface GraphqlServerOptions extends Omit<HttpsOptions, "cors"> {
  /**
   * A valid SDL string that represents the GraphQL server's schema.
   * Either `schema` or `schemaFilePath` is required.
   */
  schema?: string;
  /**
   * A relative file path from the Firebase project directory to a valid GraphQL schema.
   * Either `schema` or `schemaFilePath` is required.
   */
  schemaFilePath?: string;
  /**
   * The path where the GraphQL server will be served on the Cloud Run function.
   * e.g. https://...run.app/{path}
   * If no path is provided, "graphql" is used as the default.
   */
  path?: string;
  /** A map of functions that populate data for individual GraphQL schema fields. */
  resolvers: GraphqlResolvers;
  // TODO: Add a field for a context function.
}

/**
 * @hidden
 * Per-request context state shared by all resolvers in a particular query.
 */
export interface FirebaseContext {
  auth: {
    /** The token attached to the `X-Firebase-Auth-Token` in the request, if present. */
    token?: string;
  };
}

/**
 * @hidden
 * Resolver functions that populate data for individual GraphQL schema fields.
 */
export interface GraphqlResolvers {
  query?: {
    [resolver: string]: (
      parent: unknown,
      args: Record<string, unknown>,
      context: FirebaseContext,
      info: GraphQLResolveInfo
    ) => unknown;
  };
  mutation?: {
    [key: string]: (
      parent: unknown,
      args: Record<string, unknown>,
      context: FirebaseContext,
      info: GraphQLResolveInfo
    ) => unknown;
  };
}
