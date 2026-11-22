import {randomBytes,scrypt,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
const scryptAsync=promisify(scrypt);
export const DEFAULT_ADMIN_EMAIL='admin@ketofit.app';
export const ADMIN_EMAIL=(process.env.ADMIN_EMAIL||DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
export const COOKIE='ketofit_account';
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function sameSecret(a:string,b:string){return timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)))}
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const hash=await scryptAsync(password,salt,64) as Buffer;return `scrypt:${salt}:${hash.toString('hex')}`}
export async function verifyPassword(password:string,stored:string){const [scheme,salt,hex]=stored.split(':');if(scheme!=='scrypt'||!salt||!hex)return false;const hash=await scryptAsync(password,salt,64) as Buffer;const expected=Buffer.from(hex,'hex');return hash.length===expected.length&&timingSafeEqual(hash,expected)}
export function sameOrigin(req:NextRequest){const origin=req.headers.get('origin');try{return !origin||new URL(origin).host===req.headers.get('host')}catch{return false}}
export async function currentUser(req:NextRequest){const token=req.cookies.get(COOKIE)?.value;if(!token||token.length!==64)return null;const session=await db.session.findUnique({where:{tokenHash:digest(token)},include:{user:true}});if(!session||session.expiresAt.getTime()<Date.now())return null;return session.user}
export async function startSession(userId:string){const token=randomBytes(32).toString('hex');await db.session.create({data:{tokenHash:digest(token),userId,expiresAt:new Date(Date.now()+30*86400000)}});const response=NextResponse.json({ok:true});response.cookies.set(COOKIE,token,{httpOnly:true,secure:process.env.VERCEL==='1',sameSite:'lax',path:'/',maxAge:30*86400});response.cookies.delete('ketofit_session');response.headers.set('Cache-Control','no-store');return response}
export async function rateLimit(req:NextRequest,email:string){
 const ip=req.headers.get('x-vercel-forwarded-for')?.split(',')[0]??req.headers.get('x-forwarded-for')?.split(',')[0]??'local';
 const bucket=Math.floor(Date.now()/900000);
 for(const [key,max] of [[`ip:${ip}`,60],[`email:${email}`,12]] as const){const attempt=await db.authAttempt.upsert({where:{key:digest(`${bucket}:${key}`)},create:{key:digest(`${bucket}:${key}`),expiresAt:new Date(Date.now()+900000)},update:{count:{increment:1}}});if(attempt.count>max)return false}
 await db.authAttempt.deleteMany({where:{expiresAt:{lt:new Date()}}});return true;
}
