/*
 * A CEL expression which can be evaulated during function deployment, and
 * resolved to a value of the generic type parameter: i.e, you can pass
 * an Expression<number> as the value of an option that normally accepts numbers.
 */
export abstract class Expression<
  T extends string | number | boolean | string[]
> {
  value(): T {
    throw new Error('Not implemented');
  }

  toCEL() {
    return `{{ ${this.toString()} }}`;
  }

  toJSON(): string {
    return this.toString();
  }
}

function quoteIfString<T extends string | number | boolean | string[]>(
  literal: T
): T {
  //TODO(vsfan@): CEL's string escape semantics are slightly different than Javascript's, what do we do here?
  return typeof literal === 'string' ? (`"${literal}"` as T) : literal;
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

  value(): T {
    return !!this.test.value ? this.ifTrue : this.ifFalse;
  }

  toString() {
    return `${this.test} ? ${quoteIfString(this.ifTrue)} : ${quoteIfString(
      this.ifFalse
    )}`;
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

  value(): boolean {
    const left = this.lhs.value();
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
    return `${this.lhs} ${this.cmp} ${quoteIfString(this.rhs)}`;
  }

  then(ifTrue: T, ifFalse: T) {
    return new TernaryExpression(this, ifTrue, ifFalse);
  }
}
