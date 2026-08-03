export const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','SUSP','INT','LIVE']);
export const FINISHED_STATUSES = new Set(['FT','AET','PEN']);

const statusMap = {
  TBD:['scheduled','Time to be defined'], NS:['scheduled','Not started'],
  '1H':['live','First half'], HT:['halftime','Halftime'], '2H':['live','Second half'],
  ET:['live','Extra time'], BT:['live','Break time'], P:['live','Penalties'], LIVE:['live','Live'],
  SUSP:['suspended','Suspended'], INT:['interrupted','Interrupted'],
  PST:['postponed','Postponed'], CANC:['cancelled','Cancelled'], ABD:['abandoned','Abandoned'],
  FT:['finished','Finished'], AET:['finished','Finished after extra time'], PEN:['finished','Finished after penalties'],
  AWD:['finished','Awarded'], WO:['finished','Walkover']
};

export function mapStatus(short = 'TBD', long = '') {
  const [state,label] = statusMap[short] || ['unknown',long || 'Status unavailable'];
  return { code: short, state, label, isLive: LIVE_STATUSES.has(short), isHalftime: short === 'HT', isFinished: FINISHED_STATUSES.has(short) };
}

const image = value => typeof value === 'string' && /^https:\/\//.test(value) ? value : null;
const integer = value => Number.isSafeInteger(Number(value)) ? Number(value) : null;

export function normalizeFixture(row = {}) {
  const fixture=row.fixture||{}, league=row.league||{}, teams=row.teams||{}, goals=row.goals||{}, score=row.score||{};
  const status=mapStatus(fixture.status?.short,fixture.status?.long);
  return {
    id: integer(fixture.id), kickoffUtc: fixture.date ? new Date(fixture.date).toISOString() : null,
    timezone: fixture.timezone || 'UTC', timestamp: integer(fixture.timestamp), status,
    elapsed: integer(fixture.status?.elapsed), addedTime: integer(fixture.status?.extra),
    competition:{id:integer(league.id),name:league.name||'Competition unavailable',type:league.type||null,logo:image(league.logo),country:league.country||null,countryFlag:image(league.flag),season:integer(league.season),round:league.round||null},
    home:{id:integer(teams.home?.id),name:teams.home?.name||'Home team unavailable',badge:image(teams.home?.logo),winner:teams.home?.winner??null},
    away:{id:integer(teams.away?.id),name:teams.away?.name||'Away team unavailable',badge:image(teams.away?.logo),winner:teams.away?.winner??null},
    score:{home:goals.home??null,away:goals.away??null,halftime:{home:score.halftime?.home??null,away:score.halftime?.away??null},fulltime:{home:score.fulltime?.home??null,away:score.fulltime?.away??null},extraTime:{home:score.extratime?.home??null,away:score.extratime?.away??null},penalties:{home:score.penalty?.home??null,away:score.penalty?.away??null}},
    venue:fixture.venue?{id:integer(fixture.venue.id),name:fixture.venue.name||null,city:fixture.venue.city||null}:null,
    referee:fixture.referee||null, unavailable: !fixture.id
  };
}

export function normalizeEvent(row={}) { return {id:row.id?String(row.id):null,elapsed:integer(row.time?.elapsed),addedTime:integer(row.time?.extra),team:{id:integer(row.team?.id),name:row.team?.name||null,logo:image(row.team?.logo)},player:{id:integer(row.player?.id),name:row.player?.name||null},assist:{id:integer(row.assist?.id),name:row.assist?.name||null},type:row.type||'Unknown',detail:row.detail||null,comments:row.comments||null}; }
export function normalizeStatistics(row={}) { return {team:{id:integer(row.team?.id),name:row.team?.name||null,badge:image(row.team?.logo)},values:Object.fromEntries((row.statistics||[]).map(s=>[s.type,s.value??null])),unavailable:!row.statistics?.length}; }
export function normalizeLineup(row={}) { const player=p=>({id:integer(p.player?.id),name:p.player?.name||null,number:integer(p.player?.number),position:p.player?.pos||null,grid:p.player?.grid||null,image:image(p.player?.photo)}); return {team:{id:integer(row.team?.id),name:row.team?.name||null,badge:image(row.team?.logo),colors:row.team?.colors||null},formation:row.formation||null,coach:row.coach?{id:integer(row.coach.id),name:row.coach.name||null,image:image(row.coach.photo)}:null,starting:(row.startXI||[]).map(player),substitutes:(row.substitutes||[]).map(player),unavailable:!row.startXI?.length}; }
export function envelope(data,{provider='api_football',cache='miss',lastSuccessfulUpdate=null,isLive=false,stale=false,unavailable=false,quota=null}={}) { return {data,meta:{provider,dataTimestamp:new Date().toISOString(),cache,lastSuccessfulUpdate,isLive,stale,unavailable,quota}}; }
