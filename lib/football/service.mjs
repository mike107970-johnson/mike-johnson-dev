import { envelope } from './contracts.mjs';
import { StaleCache } from './cache.mjs';

export const validators={
  id:v=>/^\d{1,12}$/.test(v||'')?Number(v):null,
  date:v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return null;const d=new Date(`${v}T00:00:00Z`);return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v?v:null},
  season:v=>/^\d{4}$/.test(v||'')&&Number(v)>=1990&&Number(v)<=new Date().getUTCFullYear()+2?Number(v):null,
  query:v=>typeof v==='string'&&v.trim().length>=2&&v.trim().length<=80?v.trim():null
};

export class FootballService {
  constructor(provider,{cache=new StaleCache(),liveTtl=20000,upcomingTtl=300000,finishedTtl=86400000,slowTtl=3600000}={}){this.provider=provider;this.cache=cache;this.ttl={live:liveTtl,upcoming:upcomingTtl,finished:finishedTtl,slow:slowTtl}}
  async cached(key,ttl,loader,{live=false,force=false}={}){const hit=await this.cache.get(key,{ttl,staleTtl:Math.max(ttl*12,3600000)},loader,force);return envelope(hit.value,{provider:this.provider.name,cache:hit.status,lastSuccessfulUpdate:new Date(hit.storedAt).toISOString(),isLive:live,stale:hit.stale,unavailable:hit.value==null||Array.isArray(hit.value)&&!hit.value.length,quota:this.provider.quota()})}
  fixtures(date,force=false){return this.cached(`fixtures:date:${date}`,this.ttl.upcoming,()=>this.provider.fixturesByDate(date),{force})}
  live(force=false){return this.cached('fixtures:live',this.ttl.live,()=>this.provider.liveFixtures(),{live:true,force})}
  fixture(id){return this.cached(`fixture:${id}`,this.ttl.live,()=>this.provider.fixture(id))}
  events(id){return this.cached(`events:${id}`,this.ttl.live,()=>this.provider.events(id),{live:true})}
  statistics(id){return this.cached(`statistics:${id}`,this.ttl.live,()=>this.provider.statistics(id),{live:true})}
  lineups(id){return this.cached(`lineups:${id}`,this.ttl.upcoming,()=>this.provider.lineups(id))}
  players(id){return this.cached(`fixture-players:${id}`,this.ttl.live,()=>this.provider.playerStatistics(id),{live:true})}
  headToHead(home,away){return this.cached(`h2h:${home}:${away}`,this.ttl.slow,()=>this.provider.headToHead(home,away))}
  leagues(params={}){return this.cached(`leagues:${JSON.stringify(params)}`,this.ttl.slow,()=>this.provider.leagues(params))}
  standings(league,season){return this.cached(`standings:${league}:${season}`,900000,()=>this.provider.standings(league,season))}
  team(id){return this.cached(`team:${id}`,this.ttl.slow,()=>this.provider.team(id))}
  teamFixtures(team,season){return this.cached(`team-fixtures:${team}:${season}`,this.ttl.upcoming,()=>this.provider.teamFixtures(team,season))}
  squad(team){return this.cached(`squad:${team}`,this.ttl.slow,()=>this.provider.squad(team))}
  player(id,season){return this.cached(`player:${id}:${season}`,this.ttl.slow,()=>this.provider.player(id,season))}
  async search(q){const [teams,players,leagues]=await Promise.all([this.cached(`search:teams:${q}`,this.ttl.slow,()=>this.provider.request('teams',{search:q})),this.cached(`search:players:${q}`,this.ttl.slow,()=>this.provider.players({search:q})),this.cached(`search:leagues:${q}`,this.ttl.slow,()=>this.provider.leagues({search:q}))]);return envelope({teams:teams.data,players:players.data,leagues:leagues.data},{provider:this.provider.name,cache:[teams,players,leagues].every(x=>x.meta.cache==='hit')?'hit':'mixed',lastSuccessfulUpdate:new Date().toISOString(),quota:this.provider.quota()})}
  status(){return envelope({configured:Boolean(this.provider.key),connection:this.provider.metrics.lastSuccess?'connected':'not_verified',metrics:{...this.provider.metrics,cache:this.cache.stats()},refreshIntervals:this.ttl},{provider:this.provider.name,lastSuccessfulUpdate:this.provider.metrics.lastSuccess,quota:this.provider.quota()})}
}
