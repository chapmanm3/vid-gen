export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const isDev = () => process.env.NODE_ENV !== 'production';

function formatDev(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const colors: Record<LogLevel, string> = {
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    debug: '\x1b[90m',
  };
  const reset = '\x1b[0m';
  const ts = new Date().toLocaleTimeString();
  const prefix = `${colors[level]}[${level.toUpperCase()}]${reset} ${ts}`;
  let out = `${prefix} ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    out += ` ${JSON.stringify(meta)}`;
  }
  return out;
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (isDev()) {
    const output = formatDev(level, message, meta);
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  } else {
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
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
  if (isDev()) {
    log('debug', message, meta);
  }
}
