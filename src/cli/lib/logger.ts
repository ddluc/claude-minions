import chalk from 'chalk';

export interface Logger {
  indent(n: number): Logger;
  info(msg: string): void;
  dim(msg: string): void;
  error(msg: string): void;
  success(msg: string): void;
  warn(msg: string): void;
}

/**
 * Create a logger instance with the given prefix prepended to all output.
 */
function create(prefix: string): Logger {
  return {
    indent(n: number): Logger {
      return create(prefix + ' '.repeat(n * 2));
    },
    info(msg: string): void {
      console.log(prefix + chalk.bold(msg));
    },
    dim(msg: string): void {
      console.log(prefix + chalk.dim(msg));
    },
    error(msg: string): void {
      console.error(prefix + chalk.red(msg));
    },
    success(msg: string): void {
      console.log(prefix + chalk.green(msg));
    },
    warn(msg: string): void {
      console.log(prefix + chalk.yellow(msg));
    },
  };
}

export const log = create('');
