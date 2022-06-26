/** @hidden
 * @file Provides common assertion helpers which can be used to improve
 * strictness of both type checking and runtime.
 */

/**
 * Checks that the given value is of type `never` — the type that’s left after
 * all other cases have been removed.
 *
 * @param x A value of type `never`.
 */
export function assertNever(x: never): never {
  throw new Error(
    `Unhandled discriminated union member: ${JSON.stringify(x)}.`
  );
}
