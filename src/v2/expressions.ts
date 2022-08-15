import { Param } from './params/types';

/*
 * A CEL expression which can be evaulated during function deployment, and
 * resolved to a value of the generic type parameter: i.e, you can pass
 * an Expression<number> as the value of an option that normally accepts numbers.
 */
export abstract class Expression<
  T extends string | number | boolean | string[]
> {
  rawValue: string;

  get val(): any {
    return this.rawValue;
  }

  toCEL() {
    return `{{ ${this.toString()} }}`;
  }
}

export class IfElseExpression<
  T extends string | number | boolean | string[]
> extends Expression<T> {
  test: Expression<boolean>;
  ifTrue: T;
  ifFalse: T;

  constructor(test: Expression<boolean>, ifTrue: T, ifFalse: T) {
    super();
    this.test = test;
    this.ifTrue = ifTrue;
    this.ifFalse = ifFalse;
  }

  toString() {
    return `${this.test} ? ${this.ifTrue} : ${this.ifFalse}`;
  }
}

export class CompareExpression<
  T extends string | number | boolean | string[]
> extends Expression<boolean> {
  cmp: '==' | '>' | '>=' | '<' | '<=';
  lhs: Expression<T>;
  rhs: T;

  constructor(cmp: '==' | '>' | '>=' | '<' | '<=', lhs: Expression<T>, rhs: T) {
    super();
    this.cmp = cmp;
    this.lhs = lhs;
    this.rhs = rhs;
  }

  toString() {
    return `${this.lhs} ${this.cmp} ${this.rhs}`;
  }

  then(ifTrue: T, ifFalse: T) {
    return new IfElseExpression(this, ifTrue, ifFalse);
  }
}

/**
 * Creates an Expression that will cause an Options field to take on a runtime-defined
 * value based on the value of a CF3 Param defined via the helpers in the v2/params
 * namespace.
 */
export class ParamExpression<
  T extends string | number | boolean | string[]
> extends Expression<T> {
  paramRef: Param<T>;

  constructor(param: Param<T>) {
    super();
    this.paramRef = param;
  }

  toString() {
    return this.paramRef.name;
  }
}
