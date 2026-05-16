import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/config';

describe('Config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  it('loads config with required OPENAI_API_KEY', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    delete process.env.NODE_ENV;
    const cfg = getConfig();
    expect(cfg.OPENAI_API_KEY).toBe('sk-test-key');
    expect(cfg.PORT).toBe(3000);
    expect(cfg.NODE_ENV).toBe('development');
    expect(cfg.OPENAI_TTS_VOICE).toBe('alloy');
  });

  it('uses custom PORT when set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.PORT = '8080';
    const cfg = getConfig();
    expect(cfg.PORT).toBe(8080);
  });

  it('uses custom NODE_ENV when set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.NODE_ENV = 'production';
    const cfg = getConfig();
    expect(cfg.NODE_ENV).toBe('production');
  });

  it('uses custom OPENAI_TTS_VOICE when set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.OPENAI_TTS_VOICE = 'nova';
    const cfg = getConfig();
    expect(cfg.OPENAI_TTS_VOICE).toBe('nova');
  });

  it('uses custom OPENAI_TTS_MODEL when set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.OPENAI_TTS_MODEL = 'tts-1-hd';
    const cfg = getConfig();
    expect(cfg.OPENAI_TTS_MODEL).toBe('tts-1-hd');
  });

  it('uses custom OPENAI_TTS_SPEED when set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.OPENAI_TTS_SPEED = '1.5';
    const cfg = getConfig();
    expect(cfg.OPENAI_TTS_SPEED).toBe(1.5);
  });

  it('throws when OPENAI_TTS_VOICE is invalid', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.OPENAI_TTS_VOICE = 'invalid-voice';
    expect(() => getConfig()).toThrow();
  });

  it('throws when OPENAI_API_KEY is missing', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => getConfig()).toThrow('OPENAI_API_KEY');
  });

  it('throws when OPENAI_API_KEY is empty', () => {
    process.env.OPENAI_API_KEY = '';
    expect(() => getConfig()).toThrow('OPENAI_API_KEY');
  });

  it('throws when NODE_ENV is invalid', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.NODE_ENV = 'invalid';
    expect(() => getConfig()).toThrow();
  });
});
