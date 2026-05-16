import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as logger from '../../src/utils/logger';

describe('Logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs info messages', () => {
    logger.info('test message', { key: 'value' });
    expect(logSpy).toHaveBeenCalled();
    const entry = JSON.parse(logSpy.mock.calls[0][0]);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
    expect(entry.key).toBe('value');
  });

  it('logs error messages to stderr', () => {
    logger.error('error message');
    expect(errorSpy).toHaveBeenCalled();
    const entry = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(entry.level).toBe('error');
  });

  it('logs warn messages', () => {
    logger.warn('warning');
    expect(logSpy).toHaveBeenCalled();
  });

  it('only logs debug in non-production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    logger.debug('debug message');
    expect(logSpy).toHaveBeenCalled();

    process.env.NODE_ENV = 'production';
    logSpy.mockClear();

    logger.debug('should not appear');
    expect(logSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
