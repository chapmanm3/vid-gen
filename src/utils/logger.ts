export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export function info(message: string, meta?: Record<string, unknown>): void {
  log('info', message, meta);
}

export function warn(message: string, meta?: Record<string, unknown>): void {
  log('warn', message, meta);
}

export function error(message: string, meta?: Record<string, unknown>): void {
  log('error', message, meta);
}

export function debug(message: string, meta?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'production') {
    log('debug', message, meta);
  }
}
