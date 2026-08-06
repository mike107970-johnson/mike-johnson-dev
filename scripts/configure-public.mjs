import { readFile, writeFile } from 'node:fs/promises';
const target = new URL('../public/config.js', import.meta.url);
const origin = (process.env.PUBLIC_API_ORIGIN || '').trim().replace(/\/$/, '');
let text = await readFile(target, 'utf8');
if (origin) {
  if (!/^https:\/\/[^/]+\.workers\.dev(?:$|\/)/.test(origin)) throw new Error('PUBLIC_API_ORIGIN must be an absolute https://*.workers.dev URL.');
  text = text.replace(/footballApiOrigin: '[^']*'/, `footballApiOrigin: '${origin}'`);
}
await writeFile(target, text);
