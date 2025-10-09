#!/usr/bin/env node

/**
 * Configuration Loader Module
 * Loads and parses the unified YAML configuration for Firebase Functions integration tests
 */

import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = dirname(__dirname);

// Default configuration path
const DEFAULT_CONFIG_PATH = join(ROOT_DIR, "config", "suites.yaml");
const SCHEMA_PATH = join(ROOT_DIR, "config", "suites.schema.json");

// Initialize AJV validator
let validator = null;

/**
 * Initialize the JSON schema validator
 * @returns {Function} AJV validation function
 */
function getValidator() {
  if (!validator) {
    // Check if schema file exists
    if (!existsSync(SCHEMA_PATH)) {
      throw new Error(
        `Schema file not found at: ${SCHEMA_PATH}\n` +
          `Please ensure the schema file exists before using validation.`
      );
    }

    const ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false, // Allow additional properties where specified
    });

    try {
      // Load and compile the schema
      const schemaContent = readFileSync(SCHEMA_PATH, "utf8");
      const schema = JSON.parse(schemaContent);
      validator = ajv.compile(schema);
    } catch (error) {
      throw new Error(`Failed to load schema from ${SCHEMA_PATH}: ${error.message}`);
    }
  }
  return validator;
}

/**
 * Validate configuration against JSON schema
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If configuration doesn't match schema
 */
export function validateConfig(config) {
  const validate = getValidator();
  const valid = validate(config);

  if (!valid) {
    // Format validation errors for better readability
    const errors = validate.errors.map((err) => {
      const path = err.instancePath || "/";
      const message = err.message || "Unknown validation error";

      // Provide more specific error messages for common issues
      if (err.keyword === "required") {
        return `Missing required field '${err.params.missingProperty}' at ${path}`;
      } else if (err.keyword === "enum") {
        return `Invalid value at ${path}: ${message}. Allowed values: ${err.params.allowedValues.join(
          ", "
        )}`;
      } else if (err.keyword === "pattern") {
        return `Invalid format at ${path}: value doesn't match pattern ${err.params.pattern}`;
      } else if (err.keyword === "type") {
        return `Type error at ${path}: expected ${err.params.type}, got ${typeof err.data}`;
      } else {
        return `Validation error at ${path}: ${message}`;
      }
    });

    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }
}

/**
 * Load and parse the unified configuration file
 * @param {string} configPath - Path to the configuration file (optional, defaults to config/suites.yaml)
 * @returns {Object} Parsed configuration object with defaults and suites
 * @throws {Error} If configuration file is not found or has invalid YAML syntax
 */
export function loadUnifiedConfig(configPath = DEFAULT_CONFIG_PATH) {
  // Check if config file exists
  if (!existsSync(configPath)) {
    throw new Error(
      `Configuration file not found at: ${configPath}\n` +
        `Please create the unified configuration file or run the migration tool.`
    );
  }

  try {
    // Read and parse YAML file
    const configContent = readFileSync(configPath, "utf8");
    const config = parse(configContent);

    // Validate basic structure
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration: File must contain a valid YAML object");
    }

    if (!config.defaults) {
      throw new Error("Invalid configuration: Missing 'defaults' section");
    }

    if (!config.suites || !Array.isArray(config.suites)) {
      throw new Error("Invalid configuration: Missing or invalid 'suites' array");
    }

    if (config.suites.length === 0) {
      throw new Error("Invalid configuration: No suites defined");
    }

    // Validate configuration against schema
    try {
      validateConfig(config);
    } catch (validationError) {
      // Re-throw with context about which file failed
      throw new Error(`Schema validation failed for ${configPath}:\n${validationError.message}`);
    }

    return config;
  } catch (error) {
    // Enhance YAML parsing errors with context
    if (error.name === "YAMLParseError" || error.name === "YAMLException") {
      const lineInfo = error.linePos ? ` at line ${error.linePos.start.line}` : "";
      throw new Error(`YAML syntax error in configuration file${lineInfo}:\n${error.message}`);
    }

    // Re-throw other errors with context
    if (!error.message.includes("Invalid configuration:")) {
      throw new Error(`Failed to load configuration from ${configPath}: ${error.message}`);
    }

    throw error;
  }
}

/**
 * List all available suite names from the configuration
 * @param {string} configPath - Path to the configuration file (optional)
 * @returns {string[]} Array of suite names
 */
export function listAvailableSuites(configPath = DEFAULT_CONFIG_PATH) {
  const config = loadUnifiedConfig(configPath);
  return config.suites.map((suite) => suite.name);
}

/**
 * Check if the unified configuration file exists
 * @param {string} configPath - Path to check (optional)
 * @returns {boolean} True if configuration file exists
 */
export function hasUnifiedConfig(configPath = DEFAULT_CONFIG_PATH) {
  return existsSync(configPath);
}

/**
 * Get the configuration with defaults and suites
 * This is the raw configuration without suite extraction or defaults application
 * @param {string} configPath - Path to the configuration file (optional)
 * @returns {Object} Configuration object with defaults and suites array
 */
export function getFullConfig(configPath = DEFAULT_CONFIG_PATH) {
  return loadUnifiedConfig(configPath);
}

/**
 * Apply defaults to a suite configuration
 * @param {Object} suite - Suite configuration object
 * @param {Object} defaults - Default configuration values
 * @returns {Object} Suite with defaults applied
 */
function applyDefaults(suite, defaults) {
  // Deep clone the suite to avoid modifying the original
  const mergedSuite = JSON.parse(JSON.stringify(suite));

  // Apply top-level defaults
  if (!mergedSuite.projectId && defaults.projectId) {
    mergedSuite.projectId = defaults.projectId;
  }

  if (!mergedSuite.region && defaults.region) {
    mergedSuite.region = defaults.region;
  }

  // Merge dependencies (suite overrides take precedence)
  if (defaults.dependencies) {
    mergedSuite.dependencies = {
      ...defaults.dependencies,
      ...(mergedSuite.dependencies || {}),
    };
  }

  // Merge devDependencies (suite overrides take precedence)
  if (defaults.devDependencies) {
    mergedSuite.devDependencies = {
      ...defaults.devDependencies,
      ...(mergedSuite.devDependencies || {}),
    };
  }

  // Apply function-level defaults
  if (mergedSuite.functions && Array.isArray(mergedSuite.functions)) {
    mergedSuite.functions = mergedSuite.functions.map((func) => {
      const mergedFunc = { ...func };

      // Apply timeout default (540 seconds) if not specified
      if (mergedFunc.timeout === undefined && defaults.timeout !== undefined) {
        mergedFunc.timeout = defaults.timeout;
      }

      // Apply collection default (use function name) if not specified
      if (!mergedFunc.collection && mergedFunc.name) {
        mergedFunc.collection = mergedFunc.name;
      }

      return mergedFunc;
    });
  }

  return mergedSuite;
}

/**
 * Get a specific suite configuration with defaults applied
 * @param {string} suiteName - Name of the suite to extract
 * @param {string} configPath - Path to the configuration file (optional)
 * @returns {Object} Suite configuration with defaults applied
 * @throws {Error} If suite is not found
 */
export function getSuiteConfig(suiteName, configPath = DEFAULT_CONFIG_PATH) {
  const config = loadUnifiedConfig(configPath);

  // Find the requested suite
  const suite = config.suites.find((s) => s.name === suiteName);

  if (!suite) {
    // Provide helpful error with available suites
    const availableSuites = config.suites.map((s) => s.name);
    const suggestions = availableSuites
      .filter(
        (name) => name.includes(suiteName.split("_")[0]) || name.includes(suiteName.split("_")[1])
      )
      .slice(0, 3);

    let errorMsg = `Suite '${suiteName}' not found in configuration.\n`;
    errorMsg += `Available suites: ${availableSuites.join(", ")}\n`;

    if (suggestions.length > 0) {
      errorMsg += `Did you mean: ${suggestions.join(", ")}?`;
    }

    throw new Error(errorMsg);
  }

  // Apply defaults to the suite
  return applyDefaults(suite, config.defaults);
}

/**
 * Get multiple suite configurations with defaults applied
 * @param {string[]} suiteNames - Array of suite names to extract
 * @param {string} configPath - Path to the configuration file (optional)
 * @returns {Object[]} Array of suite configurations with defaults applied
 * @throws {Error} If any suite is not found
 */
export function getSuiteConfigs(suiteNames, configPath = DEFAULT_CONFIG_PATH) {
  return suiteNames.map((name) => getSuiteConfig(name, configPath));
}

/**
 * Get all suites matching a pattern with defaults applied
 * @param {string} pattern - Pattern to match (e.g., "v1_*" for all v1 suites)
 * @param {string} configPath - Path to the configuration file (optional)
 * @returns {Object[]} Array of matching suite configurations with defaults applied
 */
export function getSuitesByPattern(pattern, configPath = DEFAULT_CONFIG_PATH) {
  const config = loadUnifiedConfig(configPath);

  // Convert pattern to regex (e.g., "v1_*" -> /^v1_.*$/)
  const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
  const regex = new RegExp(`^${regexPattern}$`);

  // Filter and apply defaults to matching suites
  const matchingSuites = config.suites
    .filter((suite) => regex.test(suite.name))
    .map((suite) => applyDefaults(suite, config.defaults));

  if (matchingSuites.length === 0) {
    throw new Error(`No suites found matching pattern '${pattern}'`);
  }

  return matchingSuites;
}

// Export default configuration path for use by other modules
export const CONFIG_PATH = DEFAULT_CONFIG_PATH;
