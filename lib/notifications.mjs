import { createHash } from 'node:crypto';
export const notificationTypes=new Set(['match_starting','Goal','Goal cancelled','Red Card','halftime','second_half','extra_time','penalties','finished','postponed','cancelled']);
export function eventFingerprint(fixtureId,event={}){return createHash('sha256').update([fixtureId,event.id||'',event.type||'',event.detail||'',event.team?.id||'',event.player?.id||'',event.elapsed||'',event.addedTime||''].join(':')).digest('hex')}
export function notificationDeepLink(fixtureId){if(!/^\d{1,12}$/.test(String(fixtureId)))throw new TypeError('Invalid fixture ID');return `/match/${fixtureId}`}
export class EventDeduplicator{constructor(){this.processed=new Set()} accept(fixtureId,event){const key=eventFingerprint(fixtureId,event);if(this.processed.has(key))return false;this.processed.add(key);return true}}
