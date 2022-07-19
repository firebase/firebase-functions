/*
 * A CEL expression which can be evaulated during function deployment, and
 * resolved to a value of the generic type parameter: i.e, you can pass
 * an Expression<number> as the value of an option that normally accepts numbers.
 */
export type Expression<T extends string | number | boolean> = string; // eslint-disable-line

export type Field<T extends string | number | boolean> =
  | T
  | Expression<T>
  | null;

/**
 * Casts an Expression to its literal string value, for use by __getSpec()
 * @internal
 */
export function ExprString<Expression>(arg: Expression): string {
  return (arg as unknown) as string;
}

/**
 * Sanity check on whether a CEL expression is actually evaluatable
 * @internal
 */
export function IsValid<Expression>(arg: Expression): boolean {
  return true;
}
