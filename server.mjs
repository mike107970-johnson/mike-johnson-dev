import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./public', import.meta.url));
const port = Number(process.env.PORT || 3000);
const cache = new Map();
const inflight = new Map();
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};

export function safeDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : null; }
export function safeId(value) { return /^\d{1,12}$/.test(value || '') ? value : null; }

async function cached(key, ttl, load) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (inflight.has(key)) return inflight.get(key);
  const request = load().then(value => { cache.set(key,{value,expires:Date.now()+ttl}); return value; }).finally(()=>inflight.delete(key));
  inflight.set(key, request); return request;
}

async function getJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url,{headers,signal:controller.signal});
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

async function football(path, params, ttl) {
  if (!process.env.API_FOOTBALL_KEY) throw new Error('Football data is not configured');
  const query = new URLSearchParams(params);
  const base = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
  return cached(`football:${path}?${query}`,ttl,()=>getJson(`${base}/${path}?${query}`,{'x-apisports-key':process.env.API_FOOTBALL_KEY}));
}

function json(res,status,body) {
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(body));
}

async function api(req,res,url) {
  try {
    if (url.pathname === '/api/health') return json(res,200,{ok:true,footballConfigured:Boolean(process.env.API_FOOTBALL_KEY),supabaseConfigured:Boolean(process.env.SUPABASE_URL),timestamp:new Date().toISOString()});
    if (url.pathname === '/api/config') return json(res,200,{supabaseUrl:process.env.SUPABASE_URL || '',supabaseAnonKey:process.env.SUPABASE_ANON_KEY || ''});
    if (url.pathname === '/api/fixtures') {
      const date=safeDate(url.searchParams.get('date')); if(!date) return json(res,400,{error:'A valid date is required'});
      const live=url.searchParams.get('live')==='true';
      const data=await football('fixtures',live?{live:'all'}:{date,timezone:'UTC'},live?20000:300000);
      return json(res,200,{items:data.response || [],updatedAt:new Date().toISOString()});
    }
    if (url.pathname.startsWith('/api/fixtures/')) {
      const id=safeId(url.pathname.split('/').pop()); if(!id) return json(res,400,{error:'A valid fixture ID is required'});
      const data=await football('fixtures',{id},30000); return json(res,200,{item:data.response?.[0] || null});
    }
    if (url.pathname === '/api/news') {
      const endpoint=process.env.WORDPRESS_API_URL || 'https://www.footballvows.com/wp-json/wp/v2';
      const page=Math.max(1,Math.min(100,Number(url.searchParams.get('page')||1)));
      const items=await cached(`news:${page}`,120000,()=>getJson(`${endpoint}/posts?_embed=1&per_page=12&page=${page}`));
      return json(res,200,{items});
    }
    return json(res,404,{error:'Endpoint not found'});
  } catch (error) { return json(res,503,{error:error.name==='AbortError'?'The provider timed out':error.message,retryable:true}); }
}

async function serve(req,res,url) {
  const requested=url.pathname==='/'?'index.html':url.pathname.slice(1);
  const clean=normalize(requested).replace(/^(\.\.[/\\])+/, '');
  let file=join(root,clean);
  try { if (!(await stat(file)).isFile()) throw new Error(); }
  catch { file=join(root,'index.html'); }
  const body=await readFile(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':extname(file)==='.html'?'no-cache':'public, max-age=3600','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; img-src 'self' https: data:; connect-src 'self' https://*.supabase.co; style-src 'self'; script-src 'self'; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});
  res.end(body);
}

export const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost'); if(url.pathname.startsWith('/api/')) return api(req,res,url); try{return await serve(req,res,url);}catch{return json(res,500,{error:'Unable to load application'});}});
if (process.env.NODE_ENV !== 'test') server.listen(port,()=>console.log(`FootballVows ready on http://localhost:${port}`));
