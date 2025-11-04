const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const path = require("path");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = [
    {
        ignores: [
            "lib/",
            "dev/",
            "node_modules/",
            "coverage/",
            "docgen/",
            "v1/",
            "v2/",
            "logger/",
            "dist/",
            "spec/fixtures/",
            "scripts/**/*.js",
            "scripts/**/*.mjs",
            "protos/",
            ".prettierrc.js",
            "eslint.config.*",
            "tsdown.config.*",
            "scripts/bin-test/sources/esm-ext/index.mjs",
        ],
    },
    ...compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:jsdoc/recommended",
        "google",
        "prettier"
    ),
    {
        languageOptions: {
            parser: require("@typescript-eslint/parser"),
            parserOptions: {
                project: "tsconfig.json",
                tsconfigRootDir: __dirname,
            },
            ecmaVersion: 2022
        },
        plugins: {
            "prettier": require("eslint-plugin-prettier"),
        },
        rules: {
            "jsdoc/newline-after-description": "off",
            "jsdoc/require-jsdoc": ["warn", { publicOnly: true }],
            "jsdoc/check-tag-names": ["warn", { definedTags: ["alpha", "remarks", "typeParam", "packageDocumentation", "hidden"] }],
            "no-restricted-globals": ["error", "name", "length"],
            "prefer-arrow-callback": "error",
            "prettier/prettier": "off",
            "require-atomic-updates": "off", // This rule is so noisy and isn't useful: https://github.com/eslint/eslint/issues/11899
            "require-jsdoc": "off", // This rule is deprecated and superseded by jsdoc/require-jsdoc.
            "valid-jsdoc": "off", // This is deprecated but included in recommended configs.
            "no-prototype-builtins": "warn",
            "no-useless-escape": "warn",
            "prefer-promise-reject-errors": "warn",
        },
    },
    {
        files: ["**/*.ts"],
        rules: {
            "jsdoc/require-param-type": "off",
            "jsdoc/require-returns-type": "off",
            // Google style guide allows us to omit trivial parameters and returns
            "jsdoc/require-param": "off",
            "jsdoc/require-returns": "off",

            "@typescript-eslint/no-invalid-this": "error",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }], // Unused vars should not exist.
            "@typescript-eslint/no-misused-promises": "warn", // rule does not work with async handlers for express.
            "no-invalid-this": "off", // Turned off in favor of @typescript-eslint/no-invalid-this.
            "no-unused-vars": "off", // Off in favor of @typescript-eslint/no-unused-vars.
            eqeqeq: ["error", "always", { null: "ignore" }],
            camelcase: ["error", { properties: "never" }], // snake_case allowed in properties iif to satisfy an external contract / style

            // Ideally, all these warning should be error - let's fix them in the future.
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
            "@typescript-eslint/restrict-template-expressions": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-redundant-type-constituents": "warn",
            "@typescript-eslint/no-base-to-string": "warn",
            "@typescript-eslint/no-duplicate-type-constituents": "warn",
            "@typescript-eslint/no-require-imports": "warn",
            "@typescript-eslint/no-empty-object-type": "warn",
            "@typescript-eslint/prefer-promise-reject-errors": "warn",
        },
    },
    {
        files: ["**/*.spec.ts", "**/*.spec.js", "spec/helper.ts", "scripts/bin-test/**/*.ts", "integration_test/**/*.ts"],
        languageOptions: {
            globals: {
                mocha: true,
            },
        },
        rules: {
            "@typescript-eslint/no-unused-expressions": "off",
        }
    },
];
