import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import { fixtureEndpoint, fixtureError } from '../public/core.js';

const read = path => readFileSync(path, 'utf8');

test('production public config never points football backend at app.footballvows.com or localhost', () => {
  const config = read('public/config.js');
  assert.match(config, /footballApiOrigin/);
  assert.doesNotMatch(config, /YOUR_WORKERS_SUBDOMAIN|<account-subdomain>/);
  assert.doesNotMatch(config, /app\.footballvows\.com/);
  assert.doesNotMatch(config, /localhost.*workers/i);
});

test('fixture endpoints preserve exact dates and use live endpoint honestly', () => {
  assert.equal(fixtureEndpoint('all', '2026-08-05'), '/api/fixtures?date=2026-08-05');
  assert.equal(fixtureEndpoint('tournaments', '2026-08-05'), '/api/fixtures?date=2026-08-05');
  assert.equal(fixtureEndpoint('live', '2026-08-05'), '/api/fixtures/live');
  assert.throws(() => fixtureEndpoint('all', '08/05/2026'));
});

test('fixture error messages distinguish required failure modes', () => {
  assert.equal(fixtureError({ code: 'WORKER_URL_NOT_CONFIGURED' }).message, 'FootballVows backend has not been configured.');
  assert.equal(fixtureError({ code: 'NOT_CONFIGURED' }).title, 'API-Football key not configured');
  assert.equal(fixtureError({ code: 'RATE_LIMITED' }).title, 'Provider rate limit reached');
  assert.equal(fixtureError({ code: 'SUBSCRIPTION_REQUIRED' }).title, 'Resource unavailable on provider plan');
  assert.equal(fixtureError({}, { online: false }).title, 'Device offline');
});

test('public, Android assets, tests and docs do not contain credential-like football API keys', () => {
  const files = ['public/config.js','public/app.js','public/data.js','public/core.js','worker/index.mjs','wrangler.toml'];
  for (const file of files) {
    assert.doesNotMatch(read(file), /x-apisports-key\s*[:=]\s*['\"][A-Za-z0-9_-]{20,}/);
    assert.doesNotMatch(read(file), /API_FOOTBALL_KEY\s*=\s*['\"][A-Za-z0-9_-]{20,}/);
  }
  assert.ok(existsSync('android/gradlew'));
});
