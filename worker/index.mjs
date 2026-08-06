import { ApiFootballProvider, ProviderError } from '../lib/football/api-football.mjs';
import { envelope } from '../lib/football/contracts.mjs';
import { FootballService, validators } from '../lib/football/service.mjs';

const applications = new WeakMap();
const rateLimits = new Map();
const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const allowed = new Set(String(env.ALLOWED_ORIGINS || 'https://localhost,capacitor://localhost,http://localhost').split(',').map(value => value.trim()).filter(Boolean));
  if (origin && (allowed.has(origin) || origin === 'capacitor://localhost')) return { 'access-control-allow-origin': origin, vary: 'Origin' };
  return {};
}

function response(request, env, body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...corsHeaders(request, env), ...extraHeaders } });
}

function cacheHeaders(kind = 'default') {
  const maxAge = kind === 'live' ? 15 : kind === 'detail' ? 60 : 300;
  const swr = kind === 'live' ? 30 : kind === 'detail' ? 300 : 1800;
  return { 'cache-control': `public, max-age=${maxAge}, stale-while-revalidate=${swr}` };
}

function rateLimited(request, env) {
  const limit = Number(env.CLIENT_RATE_LIMIT_PER_MINUTE || 120);
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'anonymous';
  const bucket = `${ip}:${Math.floor(Date.now() / 60000)}`;
  const count = (rateLimits.get(bucket) || 0) + 1;
  rateLimits.set(bucket, count);
  if (rateLimits.size > 2000) for (const key of rateLimits.keys()) if (!key.endsWith(String(Math.floor(Date.now() / 60000)))) rateLimits.delete(key);
  return count > limit;
}

function error(request, env, status, code, message, retryable = false) {
  return response(request, env, { error: { code, message, retryable }, meta: { provider: 'api_football', dataTimestamp: new Date().toISOString() } }, status);
}

export function createFootballApp(env, fetchImpl = fetch) {
  const provider = new ApiFootballProvider({
    key: env.API_FOOTBALL_KEY,
    baseUrl: env.API_FOOTBALL_BASE_URL,
    host: env.API_FOOTBALL_HOST,
    timezone: env.API_FOOTBALL_TIMEZONE || 'Africa/Nairobi',
    fetchImpl
  });
  return { provider, football: new FootballService(provider) };
}

function appFor(env) {
  if (!applications.has(env)) applications.set(env, createFootballApp(env));
  return applications.get(env);
}

async function route(request, env, app = appFor(env)) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...corsHeaders(request, env), 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'Accept, Content-Type' } });
  if (request.method !== 'GET') return error(request, env, 405, 'METHOD_NOT_ALLOWED', 'The Cloudflare football API accepts GET requests only.');
  if (url.pathname === '/api/health') return response(request, env, { ok: true, worker: 'available', service: 'footballvows-football-api', providerSecretConfigured: Boolean(env.API_FOOTBALL_KEY) }, 200, { 'cache-control': 'no-store' });
  if (rateLimited(request, env)) return error(request, env, 429, 'CLIENT_RATE_LIMIT', 'Too many requests. Please retry shortly.', true);

  const path = url.pathname.replace(/^\/api\/fixtures(?=\/|$)/, '/api/football/fixtures');
  const { football, provider } = app;
  try {
    if (path === '/api/football/status') return response(request, env, football.status());
    if (path === '/api/football/fixtures/live') return response(request, env, await football.live(), 200, cacheHeaders('live'));
    if (path === '/api/football/fixtures') {
      const date = validators.date(url.searchParams.get('date'));
      return date ? response(request, env, await football.fixtures(date), 200, cacheHeaders('fixtures')) : error(request, env, 400, 'INVALID_PARAMETER', 'A valid date is required.');
    }
    let match = path.match(/^\/api\/football\/fixtures\/(\d+)$/);
    if (match) { const id = validators.id(match[1]); return id ? response(request, env, await football.fixture(id), 200, cacheHeaders('detail')) : error(request, env, 400, 'INVALID_PARAMETER', 'A valid fixture ID is required.'); }
    match = path.match(/^\/api\/football\/fixtures\/(\d+)\/(events|statistics|lineups|players|head-to-head|standings)$/);
    if (match) {
      const id = validators.id(match[1]), kind = match[2];
      if (!id) return error(request, env, 400, 'INVALID_PARAMETER', 'A valid fixture ID is required.');
      if (kind === 'events') return response(request, env, await football.events(id));
      if (kind === 'statistics') return response(request, env, await football.statistics(id));
      if (kind === 'lineups') return response(request, env, await football.lineups(id));
      if (kind === 'players') return response(request, env, await football.players(id));
      const fixture = (await football.fixture(id)).data;
      if (!fixture) return error(request, env, 404, 'NOT_FOUND', 'Fixture not found.');
      if (kind === 'standings') return fixture.competition.id && fixture.competition.season ? response(request, env, await football.standings(fixture.competition.id, fixture.competition.season)) : response(request, env, envelope([], { unavailable: true }));
      return response(request, env, await football.headToHead(fixture.home.id, fixture.away.id));
    }
    if (path === '/api/football/leagues') {
      const season = url.searchParams.get('season');
      return season && !validators.season(season) ? error(request, env, 400, 'INVALID_PARAMETER', 'A valid season is required.') : response(request, env, await football.leagues(season ? { season } : {}));
    }
    match = path.match(/^\/api\/football\/leagues\/(\d+)\/standings$/);
    if (match) {
      const season = validators.season(url.searchParams.get('season'));
      return season ? response(request, env, await football.standings(Number(match[1]), season)) : error(request, env, 400, 'INVALID_PARAMETER', 'A valid season is required.');
    }
    match = path.match(/^\/api\/football\/teams\/(\d+)$/);
    if (match) return response(request, env, await football.team(Number(match[1])));
    match = path.match(/^\/api\/football\/teams\/(\d+)\/(fixtures|squad)$/);
    if (match) {
      if (match[2] === 'squad') return response(request, env, await football.squad(Number(match[1])));
      const season = validators.season(url.searchParams.get('season'));
      return season ? response(request, env, await football.teamFixtures(Number(match[1]), season)) : error(request, env, 400, 'INVALID_PARAMETER', 'A valid season is required.');
    }
    match = path.match(/^\/api\/football\/players\/(\d+)$/);
    if (match) {
      const season = validators.season(url.searchParams.get('season'));
      return season ? response(request, env, await football.player(Number(match[1]), season)) : error(request, env, 400, 'INVALID_PARAMETER', 'A valid season is required.');
    }
    if (path === '/api/football/search') {
      const query = validators.query(url.searchParams.get('q'));
      return query ? response(request, env, await football.search(query)) : error(request, env, 400, 'INVALID_PARAMETER', 'A valid search query is required.');
    }
    return error(request, env, 404, 'NOT_FOUND', 'Football API route not found.');
  } catch (cause) {
    if (cause instanceof ProviderError) return error(request, env, cause.status, cause.code, cause.message, cause.retryable);
    return error(request, env, 500, 'INTERNAL_ERROR', 'The football API could not complete the request.', true);
  }
}

export default { fetch: route };
export { route as handleRequest };
