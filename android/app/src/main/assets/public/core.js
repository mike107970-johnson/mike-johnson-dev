const DEFAULT_API_BASE_URL='https://api.footballvows.com';

export function resolveApiUrl(resource,{native=false,config={}}={}){
  if(typeof resource!=='string')return resource;
  if(!resource.startsWith('/api/'))return resource;
  if(!native)return resource;
  const football=/^\/api\/(football|fixtures)(?:\/|$)/.test(resource);
  const base=String((football&&config.FOOTBALL_API_BASE_URL)||config.API_BASE_URL||DEFAULT_API_BASE_URL).replace(/\/$/,'');
  if(!/^https:\/\//i.test(base))throw new TypeError('Native API base URL must use HTTPS');
  return `${base}${resource}`;
}

export function dateWindow(selected,size=7){
  const centre=new Date(`${selected}T12:00:00Z`);
  if(Number.isNaN(centre.valueOf()))throw new TypeError('Invalid selected date');
  return Array.from({length:size},(_,index)=>{
    const date=new Date(centre);date.setUTCDate(date.getUTCDate()+index-Math.floor(size/2));
    return date.toISOString().slice(0,10);
  });
}

export function fixtureEndpoint(tab,date){
  if(tab==='live')return '/api/fixtures/live';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw new TypeError('A valid fixture date is required');
  return `/api/fixtures?date=${encodeURIComponent(date)}`;
}

export function fixtureError(error,{online=true}={}){
  if(!online)return {title:'Device offline',message:'Reconnect to load current scores. Previously loaded fixtures remain available where cached.'};
  const code=error?.code||'';
  if(code==='WORKER_URL_NOT_CONFIGURED')return {title:'Worker URL not configured',message:'FootballVows backend has not been configured.'};
  if(code==='NOT_CONFIGURED')return {title:'API-Football key not configured',message:'The Cloudflare Worker is available, but the football provider secret has not been configured.'};
  if(code==='RATE_LIMITED'||code==='CLIENT_RATE_LIMIT')return {title:'Provider rate limit reached',message:'Live football data is temporarily rate limited. Please retry shortly.'};
  if(code==='SUBSCRIPTION_REQUIRED'||code==='PROVIDER_VALIDATION')return {title:'Resource unavailable on provider plan',message:'The configured provider subscription does not include this football resource.'};
  if(code==='WORKER_UNAVAILABLE')return {title:'Worker unavailable',message:'The Cloudflare Worker could not complete this request.'};
  return {title:'Backend unavailable',message:error?.message||'FootballVows could not reach the scores backend. Please retry.'};
}

export function mergeUnique(items,key='id'){
  const values=new Map();
  for(const item of items||[]){const id=typeof key==='function'?key(item):item?.[key];if(id!=null&&!values.has(id))values.set(id,item)}
  return [...values.values()];
}

export function plainText(html=''){
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&#0?39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+/g,' ').trim();
}

export function normalizeExternalArticle(item,publisher){
  const url=String(item?.url||item?.link||'');
  if(!/^https:\/\//i.test(url))return null;
  return {id:String(item.id||url),publisher:String(item.publisher||publisher||'').trim(),title:plainText(item.title),summary:plainText(item.summary||item.description).slice(0,360),image:/^https:\/\//i.test(item.image||'')?item.image:null,publishedAt:new Date(item.publishedAt||item.pubDate||0).toISOString(),url};
}

export function preferenceStore(storage,prefix='footballvows:'){
  return {get(name,fallback){try{const value=storage.getItem(prefix+name);return value==null?fallback:JSON.parse(value)}catch{return fallback}},set(name,value){storage.setItem(prefix+name,JSON.stringify(value));return value}};
}
