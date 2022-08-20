module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:jsdoc/recommended",
    "google",
    "prettier",
  ],
  rules: {
    "jsdoc/newline-after-description": "off",
    "jsdoc/require-jsdoc": ["warn", { publicOnly: true }],
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "prettier/prettier": "error",
    "require-atomic-updates": "off", // This rule is so noisy and isn't useful: https://github.com/eslint/eslint/issues/11899
    "require-jsdoc": "off", // This rule is deprecated and superseded by jsdoc/require-jsdoc.
    "valid-jsdoc": "off", // This is deprecated but included in recommended configs.

    "no-prototype-builtins": "warn",
    "no-useless-escape": "warn",
    "prefer-promise-reject-errors": "warn",
  },
  overrides: [
    {
      files: ["*.ts"],
      rules: {
        "jsdoc/require-param-type": "off",
        "jsdoc/require-returns-type": "off",

        // Google style guide allows us to omit trivial parameters and returns
        "jsdoc/require-param": "off",
        "jsdoc/require-returns": "off",

        "@typescript-eslint/no-invalid-this": "error",
        "@typescript-eslint/no-unused-vars": "error", // Unused vars should not exist.
        "@typescript-eslint/no-misused-promises": "warn", // rule does not work with async handlers for express.
        "no-invalid-this": "off", // Turned off in favor of @typescript-eslint/no-invalid-this.
        "no-unused-vars": "off", // Off in favor of @typescript-eslint/no-unused-vars.
        eqeqeq: ["error", "always", { null: "ignore" }],
        camelcase: ["error", { properties: "never" }], // snake_case allowed in properties iif to satisfy an external contract / style

        // Ideally, all these warning should be error - let's fix them in  the future.
        "@typescript-eslint/no-unsafe-argument": "warn",
        "@typescript-eslint/no-unsafe-assignment": "warn",
        "@typescript-eslint/no-unsafe-call": "warn",
        "@typescript-eslint/no-unsafe-member-access": "warn",
        "@typescript-eslint/no-unsafe-return": "warn",
        "@typescript-eslint/restrict-template-expressions": "warn",
        "no-constant-condition": "warn",
      },
    },
    {
      files: ["*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
  parserOptions: {
    project: "tsconfig.json",
  },
  plugins: ["prettier", "@typescript-eslint", "jsdoc"],
  settings: {
    jsdoc: {
      tagNamePreference: {
        returns: "return",
      },
    },
  },
  parser: "@typescript-eslint/parser",
};
