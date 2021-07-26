type ParamValueType = 'string' | 'list' | 'boolean' | 'int' | 'float' | 'json';

export interface ParamSpec<T = unknown> {
  source: 'env' | 'secret';
  secret?: string;
  required?: boolean;
  default?: T;
  label?: string;
  description?: string;
  valueType?: ParamValueType;
}

export type ParamOptions<T = unknown> = Omit<
  ParamSpec<T>,
  'valueType' | 'source' | 'secretRef'
>;
export type SecretParamOptions = Omit<
  ParamSpec<string>,
  'valueType' | 'source'
>;

export class Param<T = unknown> {
  name: string;
  options: ParamOptions<T>;

  static valueType: ParamValueType = 'string';

  constructor(name: string, options: ParamOptions<T> = {}) {
    this.name = name;
    this.options = options;
  }

  get rawValue(): string | undefined {
    return process.env[this.name];
  }

  get value(): any {
    const valueType = (this.constructor as typeof Param).valueType;
    const envVal = process.env[this.name];
    switch (valueType) {
      case 'string':
        return envVal || this.options.default || '';
      case 'int':
        const intVal = parseInt(
          envVal || this.options.default?.toString() || '0',
          10
        );
        if (Number.isNaN(intVal)) {
          throw new Error(
            `unable to load param "${this.name}", value ${JSON.stringify(
              envVal
            )} could not be parsed as integer`
          );
        }
        return intVal;
      case 'float':
        const floatVal = parseFloat(
          envVal || this.options.default?.toString() || '0'
        );
        if (Number.isNaN(floatVal)) {
          throw new Error(
            `unable to load param "${this.name}", value ${JSON.stringify(
              envVal
            )} could not be parsed as float`
          );
        }
        return floatVal;
      case 'boolean':
        const lowerVal = (
          envVal ||
          this.options.default?.toString() ||
          'false'
        ).toLowerCase();
        if (
          !['true', 'y', 'yes', '1', 'false', 'n', 'no', '0'].includes(lowerVal)
        ) {
          throw new Error(
            `unable to load param "${this.name}", value ${JSON.stringify(
              envVal
            )} could not be parsed as boolean`
          );
        }
        return ['true', 'y', 'yes', '1'].includes(lowerVal);
      case 'list':
        return typeof envVal === 'string'
          ? envVal!.split(/, ?/)
          : this.options.default || [];
      case 'json':
        if (envVal) {
          try {
            return JSON.parse(envVal!) as T;
          } catch (e) {
            throw new Error(
              `unable to load param "${this.name}", value ${envVal} could not be parsed as JSON: ${e.message}`
            );
          }
        } else if (this.options?.hasOwnProperty('default')) {
          return this.options.default;
        }
        return null;
      default:
        throw new Error(`unrecognized param value type "${valueType}"`);
    }
  }

  toString() {
    return `{{params.${this.name}}}`;
  }

  toJSON() {
    return this.toString();
  }

  toSpec(): ParamSpec<string> {
    const out: ParamSpec = {
      ...this.options,
      valueType: (this.constructor as typeof Param).valueType,
      source: this.options.secret ? 'secret' : 'env',
    };
    if (this.options.default && typeof this.options.default !== 'string') {
      out.default = (this.options.default as
        | { toString?: () => string }
        | undefined)?.toString?.();
    }

    return out as ParamSpec<string>;
  }
}

export class StringParam extends Param<string> {
  // identical to the abstract class, just explicitly a string
}

export class IntParam extends Param<number> {
  static valueType: ParamValueType = 'int';
}

export class FloatParam extends Param<number> {
  static valueType: ParamValueType = 'float';
}

export class BooleanParam extends Param {
  static valueType: ParamValueType = 'boolean';
}

export class ListParam extends Param<string[]> {
  static valueType: ParamValueType = 'list';

  toSpec(): ParamSpec<string> {
    const out: ParamSpec = {
      source: 'env',
      valueType: 'list',
      ...this.options,
    };
    if (this.options.default && this.options.default.length > 0) {
      out.default = this.options.default.join(',');
    }

    return out as ParamSpec<string>;
  }
}

export class JSONParam<T = any> extends Param<T> {
  static valueType: ParamValueType = 'json';
}

export class SecretParam extends StringParam {
  toSpec(): ParamSpec<string> {
    return { ...super.toSpec(), source: 'secret' };
  }
}
