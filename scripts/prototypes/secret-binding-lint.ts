/**
 * Prototype secret binding checker using Babel.
 *
 * This is a throwaway experiment that demonstrates how the Firebase CLI could
 * detect handlers that read a secret via `secret.value()` without declaring
 * that secret in their deployment options.
 *
 * Limitations:
 *   - Only understands straightforward CommonJS exports that the CLI template emits.
 *   - Assumes secret definitions live in the same source file as the handler.
 *   - Handles `defineSecret` / `defineJSONSecret` calls with string literal names.
 *   - Supports `functions.setGlobalOptions({ secrets: [...] })` for global bindings.
 *   - Ignores exotic patterns (re-exports, helper factories, dynamic secret names).
 *
 * The goal is to get a feel for the shape of the analysis rather than to ship
 * production-ready code.
 */

import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";

interface SecretDefinition {
  readonly resourceName: string;
}

interface HandlerInfo {
  readonly exportName: string;
  readonly node: t.FunctionExpression | t.ArrowFunctionExpression;
  readonly boundSecretVars: Set<string>;
}

interface SecretUsage {
  readonly secretVar: string;
  readonly handler: t.FunctionExpression | t.ArrowFunctionExpression | null;
  readonly location: t.SourceLocation | null;
}

/**
 * Extracts the resource name string literal from a defineSecret/defineJSONSecret
 * call. Returns undefined if the call is dynamic or uses placeholders we do
 * not yet understand.
 */
function extractSecretResourceName(call: t.CallExpression): string | undefined {
  const firstArg = call.arguments[0];
  if (!firstArg) {
    return undefined;
  }

  if (t.isStringLiteral(firstArg)) {
    return firstArg.value;
  }

  return undefined;
}

function isSecretFactory(callee: t.Expression): boolean {
  if (t.isIdentifier(callee)) {
    return callee.name === "defineSecret" || callee.name === "defineJSONSecret";
  }

  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    const property = callee.property.name;
    return property === "defineSecret" || property === "defineJSONSecret";
  }

  return false;
}

function isSetGlobalOptionsCall(call: t.CallExpression): boolean {
  const callee = call.callee;
  if (!t.isMemberExpression(callee)) {
    return false;
  }

  if (!t.isIdentifier(callee.property) || callee.property.name !== "setGlobalOptions") {
    return false;
  }

  // We only care about the canonical `functions.setGlobalOptions`.
  return t.isIdentifier(callee.object, { name: "functions" });
}

function collectSecretsFromOptions(
  arg: t.Expression | t.SpreadElement | null | undefined
): string[] {
  if (!arg || !t.isObjectExpression(arg)) {
    return [];
  }

  const secretsProp = arg.properties.find((prop) => {
    if (!t.isObjectProperty(prop)) {
      return false;
    }

    if (t.isIdentifier(prop.key)) {
      return prop.key.name === "secrets";
    }

    if (t.isStringLiteral(prop.key)) {
      return prop.key.value === "secrets";
    }

    return false;
  });

  if (!secretsProp || !t.isObjectProperty(secretsProp)) {
    return [];
  }

  const value = secretsProp.value;
  if (!t.isArrayExpression(value)) {
    return [];
  }

  const secretVars: string[] = [];
  for (const element of value.elements) {
    if (t.isStringLiteral(element)) {
      secretVars.push(element.value);
    } else if (t.isIdentifier(element)) {
      secretVars.push(element.name);
    }
  }

  return secretVars;
}

function isExportAssignment(node: t.AssignmentExpression): boolean {
  const left = node.left;
  if (!t.isMemberExpression(left)) {
    return false;
  }

  const object = left.object;
  if (t.isIdentifier(object)) {
    if (object.name !== "exports" && object.name !== "module") {
      return false;
    }
    if (object.name === "module") {
      // Handle module.exports.foo
      if (!t.isIdentifier(left.property, { name: "exports" }) || !t.isMemberExpression(left)) {
        // Not module.exports.* pattern, skip.
        return false;
      }
    }
  } else if (t.isMemberExpression(object)) {
    // module.exports.foo
    if (
      !t.isIdentifier(object.object, { name: "module" }) ||
      !t.isIdentifier(object.property, { name: "exports" })
    ) {
      return false;
    }
  } else {
    return false;
  }

  return true;
}

function extractExportName(node: t.AssignmentExpression): string | undefined {
  const left = node.left;
  if (!t.isMemberExpression(left)) {
    return undefined;
  }

  const property = left.property;
  if (t.isIdentifier(property)) {
    return property.name;
  }
  if (t.isStringLiteral(property)) {
    return property.value;
  }

  return undefined;
}

function analyzeExportedHandler(expression: t.Expression): {
  handler: t.FunctionExpression | t.ArrowFunctionExpression | null;
  secretVars: Set<string>;
} {
  const secretVars = new Set<string>();
  let handler: t.FunctionExpression | t.ArrowFunctionExpression | null = null;

  const visit = (node: t.Expression | t.PrivateName) => {
    if (t.isPrivateName(node)) {
      return;
    }

    if (t.isCallExpression(node)) {
      const callee = node.callee;
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
        if (callee.property.name === "runWith") {
          const secrets = collectSecretsFromOptions(node.arguments[0]);
          secrets.forEach((secret) => secretVars.add(secret));
        }
        if (t.isExpression(callee.object)) {
          visit(callee.object);
        }
      }

      for (const arg of node.arguments) {
        if (t.isExpression(arg)) {
          if (t.isFunctionExpression(arg) || t.isArrowFunctionExpression(arg)) {
            handler = arg;
            continue;
          }
          visit(arg);
        }
      }
      return;
    }

    if (t.isMemberExpression(node) && t.isExpression(node.object)) {
      visit(node.object);
    }
  };

  visit(expression);
  return { handler, secretVars };
}

function main(entryFile: string): void {
  const source = fs.readFileSync(entryFile, "utf8");
  const ast = parse(source, {
    sourceType: "unambiguous",
    plugins: ["typescript", "jsx"],
  });

  const secretDefs = new Map<string, SecretDefinition>();
  const handlerInfo = new Map<t.FunctionExpression | t.ArrowFunctionExpression, HandlerInfo>();
  const usages: SecretUsage[] = [];
  const globalSecretVars = new Set<string>();

  traverse(ast, {
    VariableDeclarator(path) {
      const init = path.node.init;
      if (!init || !t.isCallExpression(init)) {
        return;
      }
      if (!isSecretFactory(init.callee)) {
        return;
      }
      if (!t.isIdentifier(path.node.id)) {
        return;
      }
      const resourceName = extractSecretResourceName(init);
      if (!resourceName) {
        return;
      }
      secretDefs.set(path.node.id.name, { resourceName });
    },
    CallExpression(path) {
      // Record global secret bindings.
      if (isSetGlobalOptionsCall(path.node)) {
        const secrets = collectSecretsFromOptions(path.node.arguments[0]);
        secrets.forEach((secret) => globalSecretVars.add(secret));
      }

      const callee = path.node.callee;
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property, { name: "value" })) {
        const target = callee.object;
        if (t.isIdentifier(target)) {
          const funcPath = path.getFunctionParent();
          const handlerNode =
            funcPath && (funcPath.node as t.FunctionExpression | t.ArrowFunctionExpression);
          usages.push({
            secretVar: target.name,
            handler: handlerNode ?? null,
            location: path.node.loc ?? null,
          });
        }
      }
    },
    AssignmentExpression(path) {
      if (!isExportAssignment(path.node)) {
        return;
      }

      const exportName = extractExportName(path.node);
      if (!exportName) {
        return;
      }

      if (!t.isExpression(path.node.right)) {
        return;
      }

      const { handler, secretVars } = analyzeExportedHandler(path.node.right);
      if (!handler) {
        return;
      }

      handlerInfo.set(handler, {
        exportName,
        node: handler,
        boundSecretVars: secretVars,
      });
    },
  });

  // Translate secret variables into resource names for easier comparison.
  const resolveSecretVars = (vars: Set<string>): Set<string> => {
    const names = new Set<string>();
    vars.forEach((variable) => {
      const def = secretDefs.get(variable);
      if (def) {
        names.add(def.resourceName);
      } else {
        // Allow raw string literal references like secrets: ["MY_SECRET"].
        names.add(variable);
      }
    });
    return names;
  };

  const globalSecrets = resolveSecretVars(globalSecretVars);

  const diagnostics: string[] = [];
  for (const usage of usages) {
    const def = secretDefs.get(usage.secretVar);
    const secretName = def?.resourceName ?? usage.secretVar;

    if (!usage.handler) {
      continue;
    }

    const handler = handlerInfo.get(usage.handler);
    if (!handler) {
      continue;
    }

    const localSecrets = resolveSecretVars(handler.boundSecretVars);
    const isBound = localSecrets.has(secretName) || globalSecrets.has(secretName);
    if (isBound) {
      continue;
    }

    const position = usage.location
      ? `${path.relative(process.cwd(), entryFile)}:${usage.location.start.line}:${
          usage.location.start.column + 1
        }`
      : entryFile;

    diagnostics.push(
      `Function "${handler.exportName}" reads secret "${secretName}" but does not bind it. (${position})`
    );
  }

  if (diagnostics.length === 0) {
    console.log("No unbound secret usages detected.");
    return;
  }

  console.error("Detected potential unbound secret usages:");
  diagnostics.forEach((msg) => console.error(`  - ${msg}`));
  process.exitCode = 1;
}

if (require.main === module) {
  const entry = process.argv[2];
  if (!entry) {
    console.error("Usage: ts-node secret-binding-lint.ts <path/to/source.ts>");
    process.exit(1);
  }
  main(entry);
}
