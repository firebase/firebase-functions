import chalk from "chalk";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARNING = 3,
  ERROR = 4,
  NONE = 5,
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private useEmojis: boolean;

  private constructor(logLevel: LogLevel = LogLevel.INFO, useEmojis = true) {
    this.logLevel = logLevel;
    this.useEmojis = useEmojis;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      const level = process.env.LOG_LEVEL
        ? LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] || LogLevel.INFO
        : LogLevel.INFO;
      Logger.instance = new Logger(level);
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private formatTimestamp(): string {
    return new Date().toISOString().replace("T", " ").split(".")[0];
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const timestamp = chalk.gray(this.formatTimestamp());
    const prefix = this.useEmojis ? "🔍" : "[DEBUG]";
    const formattedMsg = chalk.gray(`${prefix} ${message}`);

    console.log(`${timestamp} ${formattedMsg}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const timestamp = chalk.gray(this.formatTimestamp());
    const prefix = this.useEmojis ? "ℹ️ " : "[INFO]";
    const formattedMsg = chalk.blue(`${prefix} ${message}`);

    console.log(`${timestamp} ${formattedMsg}`, ...args);
  }

  success(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.SUCCESS)) return;

    const timestamp = chalk.gray(this.formatTimestamp());
    const prefix = this.useEmojis ? "✅" : "[SUCCESS]";
    const formattedMsg = chalk.green(`${prefix} ${message}`);

    console.log(`${timestamp} ${formattedMsg}`, ...args);
  }

  warning(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARNING)) return;

    const timestamp = chalk.gray(this.formatTimestamp());
    const prefix = this.useEmojis ? "⚠️ " : "[WARN]";
    const formattedMsg = chalk.yellow(`${prefix} ${message}`);

    console.warn(`${timestamp} ${formattedMsg}`, ...args);
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const timestamp = chalk.gray(this.formatTimestamp());
    const prefix = this.useEmojis ? "❌" : "[ERROR]";
    const formattedMsg = chalk.red(`${prefix} ${message}`);

    if (error instanceof Error) {
      console.error(`${timestamp} ${formattedMsg}`, ...args);
      console.error(chalk.red(error.stack || error.message));
    } else if (error) {
      console.error(`${timestamp} ${formattedMsg}`, error, ...args);
    } else {
      console.error(`${timestamp} ${formattedMsg}`, ...args);
    }
  }

  // Special contextual loggers for test harness
  cleanup(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const timestamp = chalk.gray(this.formatTimestamp());
    const prefix = this.useEmojis ? "🧹" : "[CLEANUP]";
    const formattedMsg = chalk.cyan(`${prefix} ${message}`);

    console.log(`${timestamp} ${formattedMsg}`, ...args);
  }

  deployment(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const timestamp = chalk.gray(this.formatTimestamp());
    const prefix = this.useEmojis ? "🚀" : "[DEPLOY]";
    const formattedMsg = chalk.magenta(`${prefix} ${message}`);

    console.log(`${timestamp} ${formattedMsg}`, ...args);
  }

  // Group related logs visually
  group(title: string): void {
    const line = chalk.gray("─".repeat(50));
    console.log(`\n${line}`);
    console.log(chalk.bold.white(title));
    console.log(line);
  }

  groupEnd(): void {
    console.log(chalk.gray("─".repeat(50)) + "\n");
  }
}

// Export singleton instance for convenience
export const logger = Logger.getInstance();

// Export legacy functions for backwards compatibility
export function logInfo(message: string): void {
  logger.info(message);
}

export function logError(message: string, error?: Error): void {
  logger.error(message, error);
}

export function logSuccess(message: string): void {
  logger.success(message);
}

export function logWarning(message: string): void {
  logger.warning(message);
}

export function logDebug(message: string): void {
  logger.debug(message);
}

export function logCleanup(message: string): void {
  logger.cleanup(message);
}

export function logDeployment(message: string): void {
  logger.deployment(message);
}