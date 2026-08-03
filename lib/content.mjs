import { createHash } from 'node:crypto';

export const stripHtml=value=>String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#039;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+/g,' ').trim();
const https=value=>typeof value==='string'&&value.startsWith('https://')?value:null;
export function normalizeWordPressPost(post={}){
  const media=post._embedded?.['wp:featuredmedia']?.[0],author=post._embedded?.author?.[0],terms=(post._embedded?.['wp:term']||[]).flat();
  const content=stripHtml(post.content?.rendered),excerpt=stripHtml(post.excerpt?.rendered)||content.slice(0,220);
  return {id:String(post.id),sourceType:'footballvows',title:stripHtml(post.title?.rendered),summary:excerpt.slice(0,280),image:https(media?.source_url),author:author?.name||'FootballVows',publishedAt:new Date(post.date_gmt?`${post.date_gmt}Z`:post.date).toISOString(),category:terms.find(t=>t.taxonomy==='category')?.name||'Latest',tags:terms.filter(t=>t.taxonomy==='post_tag').map(t=>t.name),url:https(post.link),readingMinutes:Math.max(1,Math.ceil(content.split(/\s+/).filter(Boolean).length/220))};
}
const entity=value=>stripHtml(String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1'));
const tag=(xml,name)=>xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]||'';
export function normalizeRss(xml,topic='Football'){
  const items=String(xml||'').match(/<item\b[\s\S]*?<\/item>/gi)||[];
  return items.map(item=>{const rawTitle=entity(tag(item,'title')),link=entity(tag(item,'link'))||entity(tag(item,'guid')),source=entity(tag(item,'source'));const split=rawTitle.match(/^(.*)\s+-\s+([^–—-]+)$/);const title=(split?.[1]||rawTitle).trim(),publisher=(source||split?.[2]||'External publisher').trim(),description=entity(tag(item,'description'));const media=item.match(/<(?:media:content|media:thumbnail)[^>]+url=["']([^"']+)/i)?.[1]||null;return {id:createHash('sha256').update(`${link}|${title}|${publisher}`).digest('hex').slice(0,24),sourceType:'external',title,summary:description.slice(0,280),image:https(media),publisher,publishedAt:new Date(entity(tag(item,'pubDate'))||Date.now()).toISOString(),url:https(link),topic};}).filter(x=>x.title&&x.url);
}
export function dedupeStories(stories=[]){const seen=new Set();return stories.filter(s=>{const key=`${String(s.url).replace(/[?#].*$/,'').toLowerCase()}|${s.title.toLowerCase().replace(/\W/g,'')}|${String(s.publisher||'').toLowerCase()}`;if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));}
