import { defineConfig } from "tsdown";

const rewriteProtoPath = {
  name: "rewrite-proto-path",
  resolveId(source) {
    if (source === "../../../protos/compiledFirestore") {
      return { id: "../../../../protos/compiledFirestore", external: true };
    }
    return null;
  },
};

const rewriteProtoPathMjs = {
  name: "rewrite-proto-path-mjs",
  resolveId(source) {
    if (source === "../../../protos/compiledFirestore") {
      return { id: "../../../../protos/compiledFirestore.mjs", external: true };
    }
    return null;
  },
};

export default defineConfig([
  // CommonJS build
  {
    entry: "src/**/*.ts",
    unbundle: true,
    format: "cjs",
    outDir: "lib/cjs",
    clean: true,
    dts: true,
    treeshake: false,
    plugins: [rewriteProtoPath],
  },
  // ESM build (outputs .mjs files, no package.json needed)
  {
    entry: "src/**/*.ts",
    unbundle: true,
    format: "esm",
    outDir: "lib/esm",
    clean: false, // Don't clean since CJS already cleaned
    dts: false, // Only need types once (from CJS build)
    treeshake: false,
    plugins: [rewriteProtoPathMjs],
  },
]);
