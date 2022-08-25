/*
 * A CEL expression which can be evaluated during function deployment, and
 * resolved to a value of the generic type parameter: i.e, you can pass
 * an Expression<number> as the value of an option that normally accepts numbers.
 */
export abstract class Expression<
  T extends string | number | boolean | string[]
> {
  // Returns the Expression's runtime value, based on the CLI's resolution of params.
  value(): T {
    throw new Error('Not implemented');
  }

  // Returns the Expression's representation as a braced CEL expression.
  toCEL(): string {
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

/**
 * A CEL expression corresponding to a ternary operator, e.g {{ cond ? ifTrue : ifFalse }}
 */
export class TernaryExpression<
  T extends string | number | boolean | string[]
> extends Expression<T> {
  constructor(
    private readonly test: Expression<boolean>,
    private readonly ifTrue: T,
    private readonly ifFalse: T
  ) {
    super();
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

/**
 * A CEL expression that evaluates to boolean true or false based on a comparison
 * between the value of another expression and a literal of that same type.
 */
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
      default:
        throw new Error('Unknown comparator ' + this.cmp);
    }
  }

  toString() {
    return `${this.lhs} ${this.cmp} ${quoteIfString(this.rhs)}`;
  }

  then(ifTrue: T, ifFalse: T) {
    return new TernaryExpression(this, ifTrue, ifFalse);
  }
}
