import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as logger from '../../src/utils/logger';

describe('Logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs info messages', () => {
    logger.info('test message', { key: 'value' });
    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('[INFO]');
    expect(output).toContain('test message');
    expect(output).toContain('"key":"value"');
  });

  it('logs error messages to stderr', () => {
    logger.error('error message');
    expect(errorSpy).toHaveBeenCalled();
    const output = errorSpy.mock.calls[0][0] as string;
    expect(output).toContain('[ERROR]');
    expect(output).toContain('error message');
  });

  it('logs warn messages', () => {
    logger.warn('warning');
    expect(warnSpy).toHaveBeenCalled();
    const output = warnSpy.mock.calls[0][0] as string;
    expect(output).toContain('[WARN]');
    expect(output).toContain('warning');
  });

  it('only logs debug in non-production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    logger.debug('debug message');
    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('[DEBUG]');
    expect(output).toContain('debug message');

    process.env.NODE_ENV = 'production';
    logSpy.mockClear();

    logger.debug('should not appear');
    expect(logSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
