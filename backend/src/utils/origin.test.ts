import { describe, expect, it } from 'vitest';
import { isOriginAllowed } from './origin.js';

describe('isOriginAllowed', () => {
  it('allows exact configured origins', () => {
    expect(isOriginAllowed('https://fromistargram.ddunddun.shop', [
      'https://fromistargram.ddunddun.shop'
    ])).toBe(true);
  });

  it('allows wildcard subdomains', () => {
    expect(isOriginAllowed('https://42.fromistargram.ddunddun.shop', [
      'https://*.fromistargram.ddunddun.shop'
    ])).toBe(true);
  });

  it('does not allow the apex host for wildcard entries', () => {
    expect(isOriginAllowed('https://fromistargram.ddunddun.shop', [
      'https://*.fromistargram.ddunddun.shop'
    ])).toBe(false);
  });

  it('does not allow sibling domains that only contain the allowed suffix', () => {
    expect(isOriginAllowed('https://42.fromistargram.ddunddun.shop.evil.test', [
      'https://*.fromistargram.ddunddun.shop'
    ])).toBe(false);
  });

  it('requires the same protocol for wildcard entries', () => {
    expect(isOriginAllowed('http://42.fromistargram.ddunddun.shop', [
      'https://*.fromistargram.ddunddun.shop'
    ])).toBe(false);
  });

  it('falls back to localhost when no origins are configured', () => {
    expect(isOriginAllowed('http://localhost:5173', [])).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:5173', [])).toBe(true);
    expect(isOriginAllowed('https://not-localhost.example', [])).toBe(false);
  });
});
