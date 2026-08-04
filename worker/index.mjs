import { ApiFootballProvider, ProviderError } from '../lib/football/api-football.mjs';
import { FootballService, validators } from '../lib/football/service.mjs';
import { StaleCache } from '../lib/football/cache.mjs';
import { envelope } from '../lib/football/contracts.mjs';

const DEFAULT_ALLOWED_ORIGINS=['https://localhost','capacitor://localhost','http://localhost'];
const cachesByConfig=new Map();
const rateBuckets=new Map();

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const errorBody=(code,message,retryable=false)=>({error:{code,message,retryable},meta:{provider:'api_football',dataTimestamp:new Date().toISOString(),cache:'none',lastSuccessfulUpdate:null,isLive:false,unavailable:true}});
const positive=(value,fallback,min=1,max=86400)=>Math.min(max,Math.max(min,Number(value||fallback)||fallback));

function corsHeaders(request,env){
  const origin=request.headers.get('origin');
  const allowed=new Set([...DEFAULT_ALLOWED_ORIGINS,...String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean)]);
  const headers={'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Content-Type, Accept','access-control-max-age':'86400','vary':'Origin'};
  if(origin&&allowed.has(origin))headers['access-control-allow-origin']=origin;
  return headers;
}
function rateLimit(request,env,now=Date.now()){
  const limit=positive(env.PUBLIC_RATE_LIMIT,120,1,10000),windowMs=60000;
  const key=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
  let bucket=rateBuckets.get(key);if(!bucket||now-bucket.started>=windowMs)bucket={started:now,count:0};bucket.count++;rateBuckets.set(key,bucket);
  return {allowed:bucket.count<=limit,remaining:Math.max(0,limit-bucket.count),retryAfter:Math.max(1,Math.ceil((windowMs-(now-bucket.started))/1000))};
}
function serviceFor(env,fetchImpl){
  const config=[env.API_FOOTBALL_BASE_URL,env.API_FOOTBALL_HOST,env.API_FOOTBALL_TIMEZONE].join('|');
  let cache=cachesByConfig.get(config);if(!cache){cache=new StaleCache();cachesByConfig.set(config,cache)}
  const provider=new ApiFootballProvider({key:env.API_FOOTBALL_KEY,baseUrl:env.API_FOOTBALL_BASE_URL||'https://v3.football.api-sports.io',host:env.API_FOOTBALL_HOST||'v3.football.api-sports.io',timezone:env.API_FOOTBALL_TIMEZONE||'Africa/Nairobi',fetchImpl,maxRetries:positive(env.PROVIDER_MAX_RETRIES,1,0,2)});
  return {provider,service:new FootballService(provider,{cache,liveTtl:positive(env.LIVE_CACHE_SECONDS,25)*1000,upcomingTtl:positive(env.FIXTURE_CACHE_SECONDS,300)*1000,finishedTtl:positive(env.FINISHED_CACHE_SECONDS,86400)*1000,slowTtl:positive(env.DETAIL_CACHE_SECONDS,3600)*1000})};
}

export function createWorker({fetchImpl=fetch,now=()=>Date.now()}={}){return {async fetch(request,env={}){
  const cors=corsHeaders(request,env);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='GET')return json(errorBody('METHOD_NOT_ALLOWED','Only GET requests are supported.'),405,cors);
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/health')return json({ok:true,service:'footballvows-football-api',provider:'api_football',configured:Boolean(env.API_FOOTBALL_KEY),timezone:env.API_FOOTBALL_TIMEZONE||'Africa/Nairobi'},200,cors);
  if(!path.startsWith('/api/fixtures'))return json(errorBody('NOT_FOUND','Worker endpoint not found.'),404,cors);
  if(!env.API_FOOTBALL_KEY)return json(errorBody('NOT_CONFIGURED','Football provider is not configured.'),503,cors);
  const rate=rateLimit(request,env,now());cors['x-ratelimit-remaining']=String(rate.remaining);if(!rate.allowed){cors['retry-after']=String(rate.retryAfter);return json(errorBody('CLIENT_RATE_LIMIT','Too many requests. Please retry shortly.',true),429,cors)}
  const {provider,service}=serviceFor(env,fetchImpl);
  try{
    if(path==='/api/fixtures/live')return json(await service.live(),200,cors);
    if(path==='/api/fixtures'){const date=validators.date(url.searchParams.get('date'));if(!date)return json(errorBody('INVALID_DATE','A valid date in YYYY-MM-DD format is required.'),400,cors);return json(await service.fixtures(date),200,cors)}
    let match=path.match(/^\/api\/fixtures\/([^/]+)$/);if(match){const id=validators.id(match[1]);if(!id)return json(errorBody('INVALID_FIXTURE_ID','A valid numeric fixture ID is required.'),400,cors);return json(await service.fixture(id),200,cors)}
    match=path.match(/^\/api\/fixtures\/([^/]+)\/(events|statistics|lineups|players|head-to-head|standings)$/);
    if(match){const id=validators.id(match[1]);if(!id)return json(errorBody('INVALID_FIXTURE_ID','A valid numeric fixture ID is required.'),400,cors);const kind=match[2];if(kind==='events')return json(await service.events(id),200,cors);if(kind==='statistics')return json(await service.statistics(id),200,cors);if(kind==='lineups')return json(await service.lineups(id),200,cors);if(kind==='players')return json(await service.players(id),200,cors);const fixture=(await service.fixture(id)).data;if(!fixture)return json(errorBody('FIXTURE_NOT_FOUND','Fixture not found.'),404,cors);if(kind==='head-to-head')return json(await service.headToHead(fixture.home.id,fixture.away.id),200,cors);if(!fixture.competition.id||!fixture.competition.season)return json(envelope([],{provider:provider.name,unavailable:true}),200,cors);return json(await service.standings(fixture.competition.id,fixture.competition.season),200,cors)}
    return json(errorBody('NOT_FOUND','Worker endpoint not found.'),404,cors);
  }catch(cause){const known=cause instanceof ProviderError,status=known?cause.status:503,code=known?cause.code:'WORKER_ERROR';return json(errorBody(code,known?cause.message:'Football data is temporarily unavailable.',known?cause.retryable!==false:true),status,cors)}
}}}
export default createWorker();
export const __testing={rateBuckets,cachesByConfig};
