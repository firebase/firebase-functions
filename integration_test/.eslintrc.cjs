module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true, // This is crucial for Jest globals
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:jest/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json", "./tsconfig.test.json"],
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "jest", "prettier"],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": "error",
    
    // Temporarily set these as warnings while we fix them
    "@typescript-eslint/no-unsafe-argument": "warn",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
  },
  overrides: [
    {
      files: ["*.test.ts", "*.spec.ts"],
      env: {
        jest: true,
      },
    },
    {
      files: ["*.js", "*.cjs"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
  ignorePatterns: ["dist/", "functions/", "node_modules/"],
};