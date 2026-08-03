import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiFootballProvider, ProviderError } from './lib/football/api-football.mjs';
import { FootballService, validators } from './lib/football/service.mjs';
import { RateLimiter, authenticate, clientKey } from './lib/security.mjs';

const root=fileURLToPath(new URL('./public',import.meta.url)),port=Number(process.env.PORT||3000);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const number=(name,fallback,min=1)=>Math.max(min,Number(process.env[name]||fallback));
export const provider=new ApiFootballProvider({baseUrl:process.env.API_FOOTBALL_BASE_URL,key:process.env.API_FOOTBALL_KEY,host:process.env.API_FOOTBALL_HOST,timezone:process.env.API_FOOTBALL_TIMEZONE||'Africa/Nairobi'});
export const football=new FootballService(provider,{liveTtl:number('LIVE_REFRESH_INTERVAL',20)*1000,upcomingTtl:number('UPCOMING_REFRESH_INTERVAL',300)*1000,finishedTtl:number('FINISHED_REFRESH_INTERVAL',86400)*1000,slowTtl:number('FOOTBALL_CACHE_TTL',3600)*1000});
const publicLimit=new RateLimiter({limit:number('PUBLIC_RATE_LIMIT',120)}),adminLimit=new RateLimiter({limit:number('ADMIN_RATE_LIMIT',6)});
export const safeDate=validators.date; export const safeId=v=>validators.id(v)?String(v):null;

function send(res,status,body,headers={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers});res.end(JSON.stringify(body))}
function error(res,status,code,message,retryable=false){return send(res,status,{error:{code,message,retryable},meta:{provider:provider.name,dataTimestamp:new Date().toISOString(),cache:'none',lastSuccessfulUpdate:provider.metrics.lastSuccess,isLive:false,unavailable:true}})}
const need=(value,name,res)=>value??(error(res,400,'INVALID_PARAMETER',`A valid ${name} is required`),false);

async function footballApi(req,res,url){
  const rate=publicLimit.check(clientKey(req));res.setHeader('x-ratelimit-remaining',rate.remaining);if(!rate.allowed)return error(res,429,'CLIENT_RATE_LIMIT','Too many requests. Please try again shortly.',true);
  const auth=await authenticate(req);res.setHeader('x-footballvows-auth',auth.authenticated?'authenticated':'guest');
  const p=url.pathname,force=url.searchParams.get('refresh')==='true';
  try{
    if(p==='/api/football/status')return send(res,200,football.status());
    if(p==='/api/football/fixtures/live')return send(res,200,await football.live(force));
    if(p==='/api/football/fixtures'){const date=need(validators.date(url.searchParams.get('date')),'date',res);if(!date)return;return send(res,200,await football.fixtures(date,force))}
    let m;
    if((m=p.match(/^\/api\/football\/fixtures\/(\d+)$/))){const id=need(validators.id(m[1]),'fixture ID',res);if(!id)return;return send(res,200,await football.fixture(id))}
    if((m=p.match(/^\/api\/football\/fixtures\/(\d+)\/(events|statistics|lineups|players|head-to-head)$/))){const id=need(validators.id(m[1]),'fixture ID',res);if(!id)return;const kind=m[2];if(kind==='events')return send(res,200,await football.events(id));if(kind==='statistics')return send(res,200,await football.statistics(id));if(kind==='lineups')return send(res,200,await football.lineups(id));if(kind==='players')return send(res,200,await football.players(id));const fixture=(await football.fixture(id)).data;if(!fixture)return error(res,404,'NOT_FOUND','Fixture not found');return send(res,200,await football.headToHead(fixture.home.id,fixture.away.id))}
    if(p==='/api/football/leagues'){const season=url.searchParams.get('season');if(season&&!validators.season(season))return error(res,400,'INVALID_PARAMETER','A valid season is required');return send(res,200,await football.leagues(season?{season}:{}))}
    if((m=p.match(/^\/api\/football\/leagues\/(\d+)\/standings$/))){const league=need(validators.id(m[1]),'league ID',res),season=need(validators.season(url.searchParams.get('season')),'season',res);if(!league||!season)return;return send(res,200,await football.standings(league,season))}
    if((m=p.match(/^\/api\/football\/teams\/(\d+)$/))){const id=need(validators.id(m[1]),'team ID',res);if(!id)return;return send(res,200,await football.team(id))}
    if((m=p.match(/^\/api\/football\/teams\/(\d+)\/(fixtures|squad)$/))){const id=need(validators.id(m[1]),'team ID',res);if(!id)return;if(m[2]==='squad')return send(res,200,await football.squad(id));const season=need(validators.season(url.searchParams.get('season')),'season',res);if(!season)return;return send(res,200,await football.teamFixtures(id,season))}
    if((m=p.match(/^\/api\/football\/players\/(\d+)$/))){const id=need(validators.id(m[1]),'player ID',res),season=need(validators.season(url.searchParams.get('season')),'season',res);if(!id||!season)return;return send(res,200,await football.player(id,season))}
    if(p==='/api/football/search'){const q=need(validators.query(url.searchParams.get('q')),'search query',res);if(!q)return;return send(res,200,await football.search(q))}
    if(p==='/api/football/admin/refresh'){if(req.method!=='POST')return error(res,405,'METHOD_NOT_ALLOWED','Use POST for manual refresh');if(!auth.authenticated||auth.role!=='admin')return error(res,403,'FORBIDDEN','Administrator access required');const ar=adminLimit.check(`admin:${auth.user.id}`);if(!ar.allowed)return error(res,429,'ADMIN_RATE_LIMIT','Manual refresh limit reached',true);football.cache.clear('fixtures:');return send(res,200,{data:{cleared:true},meta:{provider:provider.name,dataTimestamp:new Date().toISOString(),cache:'cleared',lastSuccessfulUpdate:provider.metrics.lastSuccess,isLive:false,unavailable:false}})}
    return error(res,404,'NOT_FOUND','Football endpoint not found');
  }catch(e){const status=e instanceof ProviderError?e.status:503;return error(res,status,e.code||'TEMPORARY_FAILURE',e.message||'Football data is temporarily unavailable',e.retryable!==false)}
}

async function newsApi(res,url){try{const endpoint=process.env.WORDPRESS_API_URL||'https://www.footballvows.com/wp-json/wp/v2',page=Math.max(1,Math.min(100,Number(url.searchParams.get('page')||1)));const r=await fetch(`${endpoint}/posts?_embed=1&per_page=12&page=${page}`,{signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error(`News provider returned ${r.status}`);return send(res,200,{data:await r.json(),meta:{provider:'footballvows_wordpress',dataTimestamp:new Date().toISOString(),cache:'miss',unavailable:false}})}catch(e){return error(res,503,'NEWS_UNAVAILABLE',e.message,true)}}
async function serve(res,url){const requested=url.pathname==='/'?'index.html':url.pathname.slice(1),clean=normalize(requested).replace(/^(\.\.[/\\])+/, '');let file=join(root,clean);try{if(!(await stat(file)).isFile())throw Error()}catch{file=join(root,'index.html')}const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':extname(file)==='.html'?'no-cache':'public, max-age=3600','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(), microphone=(), geolocation=()','content-security-policy':"default-src 'self'; img-src 'self' https: data:; connect-src 'self' https://*.supabase.co; style-src 'self'; script-src 'self'; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});res.end(body)}

export const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/health')return send(res,200,{ok:true,footballConfigured:Boolean(provider.key),supabaseConfigured:Boolean(process.env.SUPABASE_URL),timestamp:new Date().toISOString()});if(url.pathname==='/api/config')return send(res,200,{supabaseUrl:process.env.SUPABASE_URL||'',supabaseAnonKey:process.env.SUPABASE_ANON_KEY||'',footballBackend:'/api/football',defaultTimezone:provider.timezone,liveRefreshInterval:football.ttl.live});if(url.pathname.startsWith('/api/football/'))return footballApi(req,res,url);if(url.pathname==='/api/news')return newsApi(res,url);try{return await serve(res,url)}catch{return error(res,500,'APP_ERROR','Unable to load application')}});
if(process.env.NODE_ENV!=='test')server.listen(port,()=>console.log(`FootballVows ready on http://localhost:${port}`));
