import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { nextPage } from '../src/next.js';
import { NEXT_CSS as CSS } from '../src/next-app.generated.js';
import { entries } from '../scripts/next-cta-rendered.mjs';

const html = nextPage({ index: true });

describe('next-cta', () => {
  test('exactly one element is marked, with the class', () => {
    const marked = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').match(/<[a-z][^>]*\sdata-next-cta(?=[\s=>/])[^>]*>/gi) || [];
    expect(marked.length).toBe(1);
    expect(marked[0]).toMatch(/class="[^"]*\bnext-cta\b/);
  });

  test('it is the first control after the first h1', () => {
    const after = html.slice(html.indexOf('</h1>'));
    const first = after.match(/<(a|button|input|textarea)\b[^>]*>/i)[0];
    expect(first).toContain('data-next-cta');
  });

  test('css spins the border and has a reduced-motion fallback', () => {
    expect(CSS).toContain('@property --next-cta-angle');
    expect(CSS).toContain('@keyframes next-cta-spin');
    expect(CSS).toMatch(/\.next-cta\{[^}]*animation:3s linear infinite next-cta-spin/);
    expect(CSS).toMatch(/prefers-reduced-motion:reduce\)\{\.next-cta\{animation:none/);
  });

  test('bench/next-cta-rendered.json matches the rendered page', () => {
    const file = JSON.parse(readFileSync(new URL('../bench/next-cta-rendered.json', import.meta.url), 'utf8'));
    expect(file.entries).toEqual(entries());
  });
});
