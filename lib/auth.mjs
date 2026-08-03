import { createHash, randomBytes } from 'node:crypto';

const b64url=value=>Buffer.from(value).toString('base64url');
export const authConfigured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY&&process.env.PUBLIC_APP_URL);
export const cookies=req=>Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));
const secure=()=>String(process.env.PUBLIC_APP_URL||'').startsWith('https://');
export function cookie(name,value,{maxAge=600,httpOnly=true,sameSite='Lax',path='/'}={}){return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}${httpOnly?'; HttpOnly':''}${secure()?'; Secure':''}`}
export const clearAuthCookies=()=>['fv_access','fv_refresh','fv_oauth_state','fv_pkce','fv_auth_next','fv_auth_platform'].map(name=>cookie(name,'',{maxAge:0,sameSite:'None'}));
export function safeNext(value){if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.startsWith('/api/'))return '/profile';return value.slice(0,500)}
export function oauthStart(next='/profile',platform='web'){
  if(!authConfigured())throw Object.assign(new Error('FootballVows sign-in is not configured'),{code:'AUTH_NOT_CONFIGURED',status:503});
  const state=b64url(randomBytes(24)),verifier=b64url(randomBytes(48)),challenge=createHash('sha256').update(verifier).digest('base64url');
  const callbackUrl=platform==='android'?new URL(process.env.AUTH_ANDROID_DEEP_LINK||'com.footballvows.app://auth/callback'):new URL('/api/auth/callback',process.env.PUBLIC_APP_URL);callbackUrl.searchParams.set('state',state);const callback=callbackUrl.toString(),url=new URL(`${process.env.SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set('provider','google');url.searchParams.set('redirect_to',callback);url.searchParams.set('code_challenge',challenge);url.searchParams.set('code_challenge_method','s256');
  const sameSite=platform==='android'?'None':'Lax';return {url:url.toString(),cookies:[cookie('fv_oauth_state',state,{sameSite}),cookie('fv_pkce',verifier,{sameSite}),cookie('fv_auth_next',safeNext(next),{sameSite}),cookie('fv_auth_platform',platform,{sameSite})],state};
}
async function authFetch(path,{method='POST',body,token,service=false}={}){if(!authConfigured())throw Object.assign(new Error('FootballVows sign-in is not configured'),{code:'AUTH_NOT_CONFIGURED',status:503});const key=service?process.env.SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_ANON_KEY;if(!key)throw Object.assign(new Error('FootballVows sign-in is not configured'),{code:'AUTH_NOT_CONFIGURED',status:503});const response=await fetch(`${process.env.SUPABASE_URL}/auth/v1/${path}`,{method,headers:{apikey:key,authorization:`Bearer ${token||key}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});const data=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(data.msg||data.message||data.error_description||'Authentication request failed'),{code:data.error_code||'AUTH_FAILED',status:response.status});return data}
export async function exchangeCode(code,verifier){return authFetch('token?grant_type=pkce',{body:{auth_code:code,code_verifier:verifier}})}
export async function passwordSignIn(email,password){return authFetch('token?grant_type=password',{body:{email,password}})}
export async function createAccount(email,password,displayName){return authFetch('signup',{body:{email,password,data:{display_name:displayName}}})}
export async function requestPasswordReset(email){const redirectTo=new URL('/login?mode=reset',process.env.PUBLIC_APP_URL).toString();return authFetch('recover',{body:{email,redirect_to:redirectTo}})}
export async function refreshSession(refreshToken){return authFetch('token?grant_type=refresh_token',{body:{refresh_token:refreshToken}})}
export async function getUser(accessToken){return authFetch('user',{method:'GET',token:accessToken})}
export async function signOut(accessToken){if(accessToken)await authFetch('logout',{token:accessToken}).catch(()=>null)}
export async function deleteAccount(userId){if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Object.assign(new Error('Account deletion is temporarily unavailable'),{code:'DELETE_NOT_CONFIGURED',status:503});return authFetch(`admin/users/${encodeURIComponent(userId)}`,{method:'DELETE',service:true})}
export function sessionCookies(session){const expires=Math.max(60,Number(session.expires_in||3600));return [cookie('fv_access',session.access_token,{maxAge:expires,sameSite:'None'}),cookie('fv_refresh',session.refresh_token,{maxAge:60*60*24*30,sameSite:'None'})]}
