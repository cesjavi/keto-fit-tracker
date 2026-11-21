import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser,sameOrigin,digest} from '@/lib/auth';
import {stateSchema} from '@/lib/data';
import {generatePlan} from '@/lib/planning';
import {configuredProviders,generateAI,Provider,AIError} from '@/lib/ai';
export const maxDuration=60;
export async function GET(req:NextRequest){try{if(!await currentUser(req))return NextResponse.json({error:'Iniciá sesión.'},{status:401});return NextResponse.json({enabled:process.env.AI_ENABLED==='true',providers:configuredProviders(),dailyLimit:Math.min(20,Math.max(1,Number(process.env.AI_DAILY_LIMIT)||5))},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'No se pudo consultar la configuración.'},{status:503})}}
const input=z.object({week:z.iso.date(),provider:z.enum(['groq','fireworks','auto']),consent:z.literal(true)}).strict();
export async function POST(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origen no permitido.'},{status:403});try{
 const user=await currentUser(req);if(!user)return NextResponse.json({error:'Iniciá sesión.'},{status:401});
 const text=await req.text();if(text.length>2000)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413});let parsed;try{parsed=input.safeParse(JSON.parse(text))}catch{return NextResponse.json({error:'Solicitud inválida.'},{status:400})}if(!parsed.success)return NextResponse.json({error:'Seleccioná el proveedor y autorizá el envío de preferencias.'},{status:400});
 const available=configuredProviders();if(process.env.AI_ENABLED!=='true'||!available.length)return NextResponse.json({error:'La IA todavía no está configurada. Podés generar un plan sin IA.'},{status:503});
 const selection:Provider[]=parsed.data.provider==='auto'?available:available.filter(p=>p===parsed.data.provider);if(!selection.length)return NextResponse.json({error:'Ese proveedor no está configurado.'},{status:400});
 const row=await db.tracker.findUnique({where:{ownerId:user.id}});if(!row)return NextResponse.json({error:'Configurá tu perfil primero.'},{status:400});const state=stateSchema.parse(row.data);
 if(!state.preferences.onboardingComplete)return NextResponse.json({error:'Completá tu configuración inicial.'},{status:400});
 try{generatePlan(parsed.data.week,state.preferences)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Preferencias incompatibles.'},{status:400})}
 const today=new Date().toISOString().slice(0,10);const limit=Math.min(20,Math.max(1,Number(process.env.AI_DAILY_LIMIT)||5));const globalLimit=Math.min(500,Math.max(1,Number(process.env.AI_GLOBAL_DAILY_LIMIT)||30));
 for(const [label,max] of [[user.id,limit],['global',globalLimit]] as const){const key=digest(`ai:${today}:${label}`);const usage=await db.authAttempt.upsert({where:{key},create:{key,expiresAt:new Date(Date.now()+86400000)},update:{count:{increment:1}}});if(usage.count>max)return NextResponse.json({error:'Se alcanzó el límite diario de solicitudes de IA. El generador sin IA sigue disponible.'},{status:429})}
 for(let i=0;i<selection.length;i++){try{const plan=await generateAI(selection[i],parsed.data.week,state.preferences);return NextResponse.json({plan,provider:selection[i],revision:row.revision},{headers:{'Cache-Control':'no-store'}})}catch(e){const error=e instanceof AIError?e:new AIError('unexpected','Ocurrió un error al interpretar la respuesta de IA. No se guardó ningún cambio.');console.error('ketofit_ai_failure',{provider:selection[i],code:error.code,status:error.status});if(i===selection.length-1||!error.retryable)return NextResponse.json({error:error.message,code:error.code},{status:error.status})}}
 return NextResponse.json({error:'No hay un proveedor disponible.'},{status:503});
 }catch{return NextResponse.json({error:'No se pudo generar el menú.'},{status:503})}}
