/*
 * A CEL expression which can be evaulated during function deployment, and
 * resolved to a value of the generic type parameter: i.e, you can pass
 * an Expression<number> as the value of an option that normally accepts numbers.
 */
abstract class Expression<T extends string | number | boolean> {
  rawValue: string;

  constructor(celLiteral: string) {
    this.rawValue = celLiteral;
  }

  get val(): any {
    return this.rawValue;
  }

  toString() {
    return this.val();
  }

  toJSON() {
    return this.toString();
  }
}

export class ParamRef {
  name: string;

  constructor(name: string) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
      throw new Error(
        `Param name ${name} must start with an uppercase ASCII letter or underscore` +
          ', and then consist of uppercase ASCII letters, digits, and underscores.'
      );
    }
    this.name = name;
  }
}

/**
 * Creates an Expression that will cause an Options field to take on a runtime-defined
 * value based on the value of a CF3 Param defined via the helpers in the v2/params
 * namespace.
 */
export class ParamExpression<T extends string | number | boolean> extends Expression<T> {
  constructor(param: ParamRef) {
    super(`{{ params.${param.name} }}`);
  }
}

/**
 * Creates an Expression that will cause an Options field to be either true or false,
 * based on a comparison between two values. The first value must be a CF3 Param, while
 * the second can be another param or a literal value.
 * @hidden
 */
export class BooleanExpression extends Expression<boolean> {
  lhs: ParamRef;
  rhs: ParamRef | string | number | boolean;
  cmp: '==' | '<' | '>';

  constructor(lhs:ParamRef, rhs: ParamRef | string | number | boolean, cmp?: '==' | '<' | '>') {
    const rhsVal = (typeof rhs === "object") ? `params.${rhs.name}` : rhs
    super(`{{ params.${lhs.name} ${cmp} ${rhsVal} }}`)
  }
}

/**
 * Creates an Expression that will cause an Options field to be one of two provided
 * values based on a comparison from a BooleanExpression.
 * @hidden
 */
export class TernaryExpression<T extends string | number | boolean> extends Expression<T> {
  cond: BooleanExpression;
  ifTrue: T | Expression<T>;
  ifFalse: T | Expression<T>;

  constructor(cond: BooleanExpression, ifTrue: T | Expression<T>, ifFalse: T | Expression<T>) {
    const condVal = cond.toString().replace("{{ ", "").replace(" }}", "");
    const trueVal = (typeof ifTrue === "object") ? ifTrue.toString() : ifTrue;
    const falseVal = (typeof ifFalse === "object") ? ifFalse.toString() : ifFalse;
    super(`{{ ${condVal} ? ${trueVal} : ${falseVal} }}`);
  }
}

// nightmare Java hellscape
//const foo:TernaryExpression<number> = new TernaryExpression(new BooleanExpression(new ParamRef('someSecret'), 0), 24, new ParamExpression(new ParamRef('myIntParam')));
// {{ params.someSecret == 0 ? 24 : params.myIntParam }}

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
