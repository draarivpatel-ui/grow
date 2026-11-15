import { describe, expect, test } from 'bun:test';
import { cleanPlan, httpUrl, makePlan, parseJson, readPage } from '../src/plan.js';
import { MODEL_PLAN, fakeFetch } from './fixtures.js';

describe('plan', () => {
  test('httpUrl keeps only http(s) links with a dot in the host', () => {
    expect(httpUrl('https://a.com/x')).toBe('https://a.com/x');
    expect(httpUrl('javascript:alert(1)')).toBe('');
    expect(httpUrl('http://localhost')).toBe('');
    expect(httpUrl(null)).toBe('');
  });

  test('parseJson reads JSON inside code fences and text', () => {
    expect(parseJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJson('no json')).toBeNull();
  });

  test('cleanPlan drops bad links and unknown post places, keeps line breaks in bodies', () => {
    const p = cleanPlan(MODEL_PLAN);
    expect(p.places[1].url).toBe('');
    expect(p.posts[1].where).toBe('X');
    expect(p.emails[0].body).toContain('\n');
  });

  test('cleanPlan returns null without buyers, places or emails', () => {
    expect(cleanPlan({ ...MODEL_PLAN, buyers: '' })).toBeNull();
    expect(cleanPlan({ ...MODEL_PLAN, places: [] })).toBeNull();
    expect(cleanPlan({ ...MODEL_PLAN, emails: [] })).toBeNull();
    expect(cleanPlan('x')).toBeNull();
  });

  test('readPage strips scripts and tags', async () => {
    const p = await readPage('https://a.com', fakeFetch());
    expect(p.title).toBe('Thing');
    expect(p.desc).toBe('Does a thing');
    expect(p.body).toBe('Hello & welcome');
  });

  test('makePlan calls the model and Citable through the given functions', async () => {
    const page = fakeFetch(), model = fakeFetch(), citable = fakeFetch();
    const out = await makePlan('https://a.com/', { fetch: page, model, citable, key: 'k1' });
    expect(out.plan.check).toMatchObject({ score: 62, grade: 'C', report: 'https://citable.flisk.si/a.com' });
    expect(out.plan.check.fixes).toHaveLength(1);
    expect(out.plan.listings.length).toBeGreaterThan(5);
    expect(model.calls[0].init.headers.authorization).toBe('Bearer k1');
    expect(JSON.parse(model.calls[0].init.body).model).toBe('flisk-wolf-chat');
    expect(citable.calls[0].url).toContain('citable.flisk.si/api/check');
    expect(page.calls.every((c) => !c.url.includes('inference'))).toBe(true);
  });

  test('makePlan reports a used-up budget as busy', async () => {
    const out = await makePlan('https://a.com/', { fetch: fakeFetch(), model: fakeFetch({ modelStatus: 429, modelError: 'Daily limit reached' }), key: 'k' });
    expect(out.error).toBe('busy');
  });
});
