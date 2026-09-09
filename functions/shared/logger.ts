/**
 * One JSON line per log entry so CloudWatch Logs Insights can filter on eventId,
 * stage and result without X-Ray or a trace map.
 */
import { optionalEnv } from "./env";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;

export type LogLevel = keyof typeof LEVELS;
export type LogFields = Record<string, unknown>;

const configuredLevel = (): number => {
  const level = optionalEnv("LOG_LEVEL", "info").toLowerCase() as LogLevel;
  return LEVELS[level] ?? LEVELS.info;
};

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export const createLogger = (base: LogFields = {}): Logger => {
  const emit = (level: LogLevel, message: string, fields: LogFields = {}): void => {
    if (LEVELS[level] < configuredLevel()) return;
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...base,
      ...fields,
    });
    if (level === "error") {
      console.error(line);
    } else {
      console.log(line);
    }
  };

  return {
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
    child: (fields) => createLogger({ ...base, ...fields }),
  };
};

/** Errors are logged as data, never as a raw stack string. */
export const errorFields = (err: unknown): LogFields =>
  err instanceof Error
    ? { errorName: err.name, errorMessage: err.message }
    : { errorName: "UnknownError", errorMessage: String(err) };
