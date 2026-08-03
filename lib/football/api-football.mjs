import { normalizeEvent, normalizeFixture, normalizeLineup, normalizeStatistics } from './contracts.mjs';

export class ProviderError extends Error { constructor(message,{status=502,code='PROVIDER_ERROR',retryable=true,quota=null}={}){super(message);this.name='ProviderError';this.status=status;this.code=code;this.retryable=retryable;this.quota=quota} }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export class ApiFootballProvider {
  constructor({baseUrl,key,host='v3.football.api-sports.io',timezone='Africa/Nairobi',fetchImpl=fetch,maxRetries=2}={}){this.name='api_football';this.baseUrl=(baseUrl||'https://v3.football.api-sports.io').replace(/\/$/,'');this.key=key;this.host=host;this.timezone=timezone;this.fetch=fetchImpl;this.maxRetries=maxRetries;this.metrics={requests:0,failures:0,rateLimits:0,remaining:null,limit:null,lastSuccess:null,lastLiveUpdate:null,recentErrors:[]}}
  async request(path,params={}){
    if(!this.key)throw new ProviderError('Football data provider is not configured',{status:503,code:'NOT_CONFIGURED',retryable:false});
    const url=new URL(`${this.baseUrl}/${path}`);for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,String(v));
    let last;
    for(let attempt=0;attempt<=this.maxRetries;attempt++){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);this.metrics.requests++;
      try{const response=await this.fetch(url,{headers:{'x-apisports-key':this.key,'x-rapidapi-host':this.host,'accept':'application/json'},signal:controller.signal});
        const remaining=response.headers.get('x-ratelimit-requests-remaining')??response.headers.get('x-ratelimit-remaining'),limit=response.headers.get('x-ratelimit-requests-limit');if(remaining!==null)this.metrics.remaining=Number(remaining);if(limit!==null)this.metrics.limit=Number(limit);
        if(response.status===401||response.status===403)throw new ProviderError('Provider authentication failed',{status:502,code:'AUTHENTICATION_ERROR',retryable:false});
        if(response.status===429){this.metrics.rateLimits++;const retry=Number(response.headers.get('retry-after')||1);throw new ProviderError('Provider rate limit reached',{status:503,code:'RATE_LIMITED',quota:this.quota(),retryable:attempt<this.maxRetries,retryAfter:retry});}
        if(!response.ok)throw new ProviderError(`Provider request failed (${response.status})`,{retryable:response.status>=500});
        const body=await response.json();if(body.errors&&(Array.isArray(body.errors)?body.errors.length:Object.keys(body.errors).length))throw new ProviderError('Provider rejected the request',{code:'PROVIDER_VALIDATION',retryable:false});
        this.metrics.lastSuccess=new Date().toISOString();return body.response||[];
      }catch(error){last=error;this.metrics.failures++;this.metrics.recentErrors.unshift({at:new Date().toISOString(),code:error.code||error.name});this.metrics.recentErrors=this.metrics.recentErrors.slice(0,10);if(error.retryable===false||attempt===this.maxRetries)break;await sleep(Math.min(250*2**attempt,2000));}finally{clearTimeout(timer)}
    }throw last instanceof ProviderError?last:new ProviderError(last?.name==='AbortError'?'Provider timed out':'Provider temporarily unavailable',{code:last?.name==='AbortError'?'TIMEOUT':'TEMPORARY_FAILURE'});
  }
  quota(){return {remaining:this.metrics.remaining,limit:this.metrics.limit}}
  fixturesByDate(date){return this.request('fixtures',{date,timezone:this.timezone}).then(rows=>rows.map(normalizeFixture))}
  liveFixtures(){return this.request('fixtures',{live:'all',timezone:this.timezone}).then(rows=>{this.metrics.lastLiveUpdate=new Date().toISOString();return rows.map(normalizeFixture)})}
  fixture(id){return this.request('fixtures',{id,timezone:this.timezone}).then(rows=>rows[0]?normalizeFixture(rows[0]):null)}
  events(id){return this.request('fixtures/events',{fixture:id}).then(rows=>rows.map(normalizeEvent))}
  statistics(id){return this.request('fixtures/statistics',{fixture:id}).then(rows=>rows.map(normalizeStatistics))}
  lineups(id){return this.request('fixtures/lineups',{fixture:id}).then(rows=>rows.map(normalizeLineup))}
  playerStatistics(id){return this.request('fixtures/players',{fixture:id})}
  headToHead(home,away){return this.request('fixtures/headtohead',{h2h:`${home}-${away}`,last:10,timezone:this.timezone}).then(rows=>rows.map(normalizeFixture))}
  leagues(params={}){return this.request('leagues',params)} standings(league,season){return this.request('standings',{league,season})}
  team(id){return this.request('teams',{id})} teamFixtures(team,season,last=20){return this.request('fixtures',{team,season,last,timezone:this.timezone}).then(rows=>rows.map(normalizeFixture))}
  squad(team){return this.request('players/squads',{team})} player(id,season){return this.request('players',{id,season})}
  players(params){return this.request('players',params)} coaches(params){return this.request('coachs',params)} injuries(params){return this.request('injuries',params)}
  teamForm(team,league,season){return this.request('teams/statistics',{team,league,season})} topScorers(league,season){return this.request('players/topscorers',{league,season})}
  countries(){return this.request('countries')} seasons(){return this.request('leagues/seasons')} odds(fixture){return this.request('odds',{fixture})}
}
