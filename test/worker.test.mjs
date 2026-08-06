import assert from 'node:assert/strict';
import test from 'node:test';
import { createFootballApp, handleRequest } from '../worker/index.mjs';
import fixturePayload from './fixtures/api-football-fixtures.json' with { type: 'json' };

const env = { API_FOOTBALL_KEY: 'sanitized-test-key', ALLOWED_ORIGINS: 'https://localhost' };
const providerFetch = async url => new Response(JSON.stringify({ response: String(url).includes('live=all') ? [fixturePayload.response[1]] : fixturePayload.response }), { status: 200, headers: { 'content-type': 'application/json' } });

test('Worker exposes normalized fixture aliases without returning its secret', async () => {
  const app = createFootballApp(env, providerFetch);
  const request = new Request('https://footballvows-football-api.example.workers.dev/api/fixtures?date=2026-08-03', { headers: { origin: 'https://localhost' } });
  const response = await handleRequest(request, env, app), body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://localhost');
  assert.equal(body.data[0].id, 1001);
  assert.equal(JSON.stringify(body).includes(env.API_FOOTBALL_KEY), false);
});

test('Worker rejects invalid dates before calling API-Football', async () => {
  let calls = 0;
  const app = createFootballApp(env, async () => { calls++; return providerFetch(); });
  const response = await handleRequest(new Request('https://example.workers.dev/api/football/fixtures?date=bad'), env, app);
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test('Worker health reports secret presence, never its value', async () => {
  const response = await handleRequest(new Request('https://example.workers.dev/api/health'), env, createFootballApp(env, providerFetch));
  assert.deepEqual(await response.json(), { ok: true, worker: 'available', service: 'footballvows-football-api', providerSecretConfigured: true });
});
