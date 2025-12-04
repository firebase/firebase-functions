import { defineConfig } from "tsdown";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const majorVersion = pkg.version.split(".")[0];

const rewriteProtoPathMjs = {
  name: "rewrite-proto-path-mjs",
  resolveId(source) {
    if (source === "../../../protos/compiledFirestore") {
      return { id: "../../../../protos/compiledFirestore.mjs", external: true };
    }
    return null;
  },
};

// Note: We use tsc (via tsconfig.release.json) for .d.ts generation instead of tsdown's
// built-in dts option due to issues with rolldown-plugin-dts.
// See: https://github.com/sxzz/rolldown-plugin-dts/issues/121

const define = {
  __FIREBASE_FUNCTIONS_MAJOR_VERSION__: JSON.stringify(majorVersion),
};

export default defineConfig([
  {
    entry: "src/**/*.ts",
    unbundle: true,
    format: "cjs",
    outDir: "lib",
    clean: true,
    dts: false, // Use tsc for type declarations
    treeshake: false,
    external: ["../../../protos/compiledFirestore"],
    define,
  },
  {
    entry: "src/**/*.ts",
    unbundle: true,
    format: "esm",
    outDir: "lib/esm",
    clean: false, // Don't clean - need to keep cjs/ output
    dts: false, // Use tsc for type declarations
    treeshake: false,
    plugins: [rewriteProtoPathMjs],
    define,
  },
]);