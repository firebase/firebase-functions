import { defineConfig } from "tsdown";

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
  {
    entry: "src/**/*.ts",
    unbundle: true,
    format: "cjs",
    outDir: "lib",
    clean: true,
    dts: false,
    treeshake: false,
    external: ["../../../protos/compiledFirestore"],
  },
  {
    entry: "src/**/*.ts",
    unbundle: true,
    format: "esm",
    outDir: "lib/esm",
    clean: false, // Don't clean - need to keep cjs/ output
    dts: false,
    treeshake: false,
    plugins: [rewriteProtoPathMjs],
  },
]);