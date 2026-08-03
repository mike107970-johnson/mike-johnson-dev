export class StaleCache {
  constructor(){this.entries=new Map();this.inflight=new Map();this.hits=0;this.misses=0;}
  peek(key){return this.entries.get(key)||null}
  async get(key,{ttl,staleTtl=ttl*6},loader,force=false){
    const now=Date.now(),entry=this.entries.get(key);
    if(!force&&entry&&now-entry.storedAt<ttl){this.hits++;return {value:entry.value,status:'hit',stale:false,storedAt:entry.storedAt}}
    if(!force&&this.inflight.has(key)){this.hits++;return this.inflight.get(key)}
    this.misses++;
    const pending=(async()=>{try{const value=await loader();const fresh={value,storedAt:Date.now()};this.entries.set(key,fresh);return {value,status:entry?'revalidated':'miss',stale:false,storedAt:fresh.storedAt}}catch(error){if(entry&&now-entry.storedAt<staleTtl)return {value:entry.value,status:'stale',stale:true,storedAt:entry.storedAt,error};throw error}finally{this.inflight.delete(key)}})();
    this.inflight.set(key,pending);return pending;
  }
  clear(prefix=''){let count=0;for(const key of this.entries.keys())if(key.startsWith(prefix)){this.entries.delete(key);count++}return count}
  stats(){const total=this.hits+this.misses;return {entries:this.entries.size,hits:this.hits,misses:this.misses,hitRate:total?this.hits/total:0}}
}
