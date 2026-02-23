import { describe, it, expect } from 'vitest';
import { parseMentions, colorRole, parseEnvFile } from '../utils.js';

describe('parseMentions', () => {
  it('extracts single @mention', () => {
    const mentions = parseMentions('@cao review the architecture');
    expect(mentions).toEqual(new Set(['cao']));
  });

  it('extracts multiple @mentions', () => {
    const mentions = parseMentions('@cao @be-engineer please coordinate');
    expect(mentions).toEqual(new Set(['cao', 'be-engineer']));
  });

  it('deduplicates repeated @mentions', () => {
    const mentions = parseMentions('@cao hello @cao again');
    expect(mentions).toEqual(new Set(['cao']));
  });

  it('returns empty set when no mentions', () => {
    const mentions = parseMentions('just a regular message');
    expect(mentions).toEqual(new Set());
  });

  it('extracts all valid roles', () => {
    const mentions = parseMentions('@pm @cao @fe-engineer @be-engineer @qa');
    expect(mentions).toEqual(new Set(['pm', 'cao', 'fe-engineer', 'be-engineer', 'qa']));
  });

  it('ignores invalid @mentions', () => {
    const mentions = parseMentions('@invalid @nobody @cao');
    expect(mentions).toEqual(new Set(['cao']));
  });

  it('handles mentions mid-word boundary', () => {
    const mentions = parseMentions('hey @cao, what do you think?');
    expect(mentions).toEqual(new Set(['cao']));
  });

  it('works correctly on consecutive calls (regex lastIndex reset)', () => {
    parseMentions('@cao hello');
    const second = parseMentions('@be-engineer world');
    expect(second).toEqual(new Set(['be-engineer']));
  });

  it('parses @all mention', () => {
    const mentions = parseMentions('hey @all please check this');
    expect(mentions).toEqual(new Set(['all']));
  });

  it('parses @all alongside explicit role mentions', () => {
    const mentions = parseMentions('@all and @cao please review');
    expect(mentions).toEqual(new Set(['all', 'cao']));
  });
});

describe('colorRole', () => {
  it('returns a colored string for known roles', () => {
    const result = colorRole('cao');
    expect(result).toContain('cao');
    expect(typeof result).toBe('string');
  });

  it('returns a string for unknown roles', () => {
    const result = colorRole('unknown');
    expect(result).toContain('unknown');
    expect(typeof result).toBe('string');
  });
});

describe('parseEnvFile', () => {
  it('parses simple key=value pairs', () => {
    const result = parseEnvFile('KEY=value\nOTHER=test');
    expect(result).toEqual({ KEY: 'value', OTHER: 'test' });
  });

  it('skips empty lines and comments', () => {
    const result = parseEnvFile('# comment\n\nKEY=value\n  # another comment\n');
    expect(result).toEqual({ KEY: 'value' });
  });

  it('strips double quotes', () => {
    const result = parseEnvFile('KEY="hello world"');
    expect(result).toEqual({ KEY: 'hello world' });
  });

  it('strips single quotes', () => {
    const result = parseEnvFile("KEY='hello world'");
    expect(result).toEqual({ KEY: 'hello world' });
  });

  it('handles values with equals signs', () => {
    const result = parseEnvFile('KEY=abc=def=ghi');
    expect(result).toEqual({ KEY: 'abc=def=ghi' });
  });

  it('handles empty values', () => {
    const result = parseEnvFile('KEY=');
    expect(result).toEqual({ KEY: '' });
  });

  it('returns empty object for empty string', () => {
    const result = parseEnvFile('');
    expect(result).toEqual({});
  });

  it('skips lines without equals sign', () => {
    const result = parseEnvFile('INVALID_LINE\nKEY=value');
    expect(result).toEqual({ KEY: 'value' });
  });

  it('trims whitespace around keys and values', () => {
    const result = parseEnvFile('  KEY  =  value  ');
    expect(result).toEqual({ KEY: 'value' });
  });
});
