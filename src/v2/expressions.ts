import { Param } from './params/types';

/*
 * A CEL expression which can be evaulated during function deployment, and
 * resolved to a value of the generic type parameter: i.e, you can pass
 * an Expression<number> as the value of an option that normally accepts numbers.
 */
export abstract class Expression<
  T extends string | number | boolean | string[]
> {
  get value(): T {
    throw new Error('Not implemented');
  }

  toCEL() {
    return `{{ ${this.toString()} }}`;
  }
}

export class TernaryExpression<
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

  get value(): T {
    return !!this.test.value ? this.ifTrue : this.ifFalse;
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

  get value(): boolean {
    const left = this.lhs.value;
    switch (this.cmp) {
      case '==':
        return left === this.rhs;
      case '>':
        return left > this.rhs;
      case '>=':
        return left >= this.rhs;
      case '<':
        return left < this.rhs;
      case '<=':
        return left <= this.rhs;
    }
  }

  toString() {
    return `${this.lhs} ${this.cmp} ${this.rhs}`;
  }

  then(ifTrue: T, ifFalse: T) {
    return new TernaryExpression(this, ifTrue, ifFalse);
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

  get value(): T {
    return this.paramRef.value;
  }

  toString() {
    return this.paramRef.name;
  }
}
