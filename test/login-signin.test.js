import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { fakeD1 } from './fake-d1.js';
import { makeKeys, signToken } from './login-signer.js';

const O = 'https://grow.flisk.si';
const deps = { fetch: async () => new Response('no', { status: 500 }), cache: null };
const setup = async () => {
  const keys = await makeKeys();
  const other = await makeKeys();
  return { keys, other, env: { DB: fakeD1(), SESSION_SECRET: 'test-secret', LOGIN_PUBLIC_KEY: keys.publicKey } };
};
// Start sign-in and return the state grow put in the cookie and in the return link.
const start = async (env) => {
  const r = await handle(new Request(`${O}/auth/start`), env, deps);
  const loc = new URL(r.headers.get('location'));
  const back = new URL(loc.searchParams.get('return'));
  return { r, loc, back, s: back.searchParams.get('s'), cookie: r.headers.get('set-cookie').split(';')[0] };
};
const done = (env, cookie, s, token) => handle(new Request(`${O}/auth/done?s=${s}&flisk_token=${encodeURIComponent(token)}`, { headers: { cookie } }), env, deps);

describe('sign-in through login.flisk.si', () => {
  test('start sends the visitor to login with a return link on this site, and no GitHub app is needed', async () => {
    const { env } = await setup();
    const { loc, back, s } = await start(env);
    expect(loc.origin + loc.pathname).toBe('https://login.flisk.si/start');
    expect(back.origin + back.pathname).toBe(`${O}/auth/done`);
    expect(s.length).toBeGreaterThan(8);
  });

  test('a good token signs the person in and moves browser sites into the account', async () => {
    const { env, keys } = await setup();
    const me = await handle(new Request(`${O}/me`), env, deps);
    const browser = me.headers.get('set-cookie').split(';')[0];
    await handle(new Request(`${O}/api/sites`, { method: 'POST', headers: { cookie: browser, 'content-type': 'application/json', origin: O }, body: JSON.stringify({ url: 'https://mine.example/' }) }), env, deps);
    const st = await start(env);
    const token = await signToken(keys.signingKey, { login: 'octo', id: 42, aud: O });
    const r = await done(env, `${browser}; ${st.cookie}`, st.s, token);
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/me');
    const signed = r.headers.getSetCookie().find((x) => x.startsWith('grow_s=')).split(';')[0];
    const api = await (await handle(new Request(`${O}/api/me`, { headers: { cookie: signed } }), env, deps)).json();
    expect(api.user.login).toBe('octo');
    expect(api.sites.map((x) => x.url)).toEqual(['https://mine.example/']);
  });

  const fails = async (mutate) => {
    const { env, keys, other } = await setup();
    const st = await start(env);
    const a = await mutate({ env, keys, other, st });
    const r = await done(env, a.cookie ?? st.cookie, a.s ?? st.s, a.token);
    expect(r.headers.get('location')).toBe('/me?signin=failed');
    expect(r.headers.getSetCookie().some((x) => x.startsWith('grow_s='))).toBe(false);
  };
  test('a token for another site is refused', () => fails(async ({ keys }) => ({ token: await signToken(keys.signingKey, { login: 'x', id: 1, aud: 'https://chat.flisk.si' }) })));
  test('a token signed by another key is refused', () => fails(async ({ other }) => ({ token: await signToken(other.signingKey, { login: 'x', id: 1, aud: O }) })));
  test('an expired token is refused', () => fails(async ({ keys }) => ({ token: await signToken(keys.signingKey, { login: 'x', id: 1, aud: O }, Date.now() - 3600e3) })));
  test('a tampered token is refused', () => fails(async ({ keys }) => { const t = await signToken(keys.signingKey, { login: 'x', id: 1, aud: O }); return { token: 'A' + t.slice(1) }; }));
  test('a wrong state is refused (login CSRF)', () => fails(async ({ keys }) => ({ s: 'forged', token: await signToken(keys.signingKey, { login: 'x', id: 1, aud: O }) })));
  test('a missing state cookie is refused', () => fails(async ({ keys }) => ({ cookie: '', token: await signToken(keys.signingKey, { login: 'x', id: 1, aud: O }) })));

  test('without LOGIN_PUBLIC_KEY, /auth/done does nothing and /auth/start uses the old GitHub path', async () => {
    const env = { DB: fakeD1(), SESSION_SECRET: 'test-secret' };
    expect((await handle(new Request(`${O}/auth/start`), env, deps)).status).toBe(503);
    const r = await handle(new Request(`${O}/auth/done?s=a&flisk_token=b`, { headers: { cookie: 'grow_state=a' } }), env, deps);
    expect(r.headers.get('location')).toBe('/me?signin=failed');
  });
});

describe('the standard sign-in button', () => {
  test('the cabinet offers "Start free with GitHub" with the no-card line and utm tags', async () => {
    const { env } = await setup();
    const page = await (await handle(new Request(`${O}/me`), env, deps)).text();
    expect(page).toContain("'Start free with GitHub'");
    expect(page).toContain('No card. Free to start.');
    expect(page).toContain('/auth/start?utm_source=grow&utm_medium=cta&utm_campaign=free-key');
    expect(page).not.toContain('Sign in with GitHub');
  });
  test('/api/me says sign-in is ready with the Flisk login key, and not without it', async () => {
    const { env } = await setup();
    const meSignIn = async (e) => {
      const cookie = (await handle(new Request(`${O}/me`), e, deps)).headers.get('set-cookie').split(';')[0];
      return (await (await handle(new Request(`${O}/api/me`, { headers: { cookie } }), e, deps)).json()).signIn;
    };
    expect(await meSignIn(env)).toBe(true);
    expect(await meSignIn({ DB: fakeD1(), SESSION_SECRET: 'x' })).toBe(false);
  });
  test('/auth/start ignores the utm tags', async () => {
    const { env } = await setup();
    const r = await handle(new Request(`${O}/auth/start?utm_source=grow&utm_medium=cta&utm_campaign=free-key`), env, deps);
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).not.toContain('utm_');
  });
});
