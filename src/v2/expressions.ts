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
 * Creates an Expression that will cause an Options field to take on a runtime-defined
 * value equal to a CF3 Param defined by the functions in v2/params.ts.
 */
export function FromParam<T extends string | number | boolean>(
  paramName: string
): Expression<T> {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(paramName)) {
    throw new Error(
      `Param name ${paramName} must start with an uppercase ASCII letter or underscore` +
        ', and then consist of uppercase ASCII letters, digits, and underscores.'
    );
  }
  return `{{ params.${paramName} }}`;
}

/**
 * Creates an Expression that will cause an Options field to take on a runtime-defined
 * value obtained by evaluating the provided CEL expression.
 * The CLI does not currently have the capability to evaluate arbitrary CEL expressions.
 * You almost certainly want to use FromParam() instead.
 */
export function FromCEL<T extends string | number | boolean>(
  celString: string
): Expression<T> {
  const numOpens = celString.split('{{').length - 1;
  const numCloses = celString.split('}}').length - 1;
  if (numOpens == 0 || numOpens !== numCloses) {
    throw new Error(
      `Provided CEL expression ${celString} doesn't seem to be well formed.`
    );
  }
  return celString;
}

/**
 * Casts an Expression to its literal string value, for use by __getSpec()
 * @internal
 */
export function ExprString<Expression>(arg: Expression): string {
  return (arg as unknown) as string;
}
