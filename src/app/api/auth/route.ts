import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {Prisma} from '@prisma/client';
import {db} from '@/lib/db';
import {ADMIN_EMAIL,hashPassword,verifyPassword,sameSecret,startSession,sameOrigin,rateLimit} from '@/lib/auth';
import {freshState} from '@/lib/data';
const credentials=z.object({mode:z.enum(['login','register']),email:z.email().max(254).transform(v=>v.trim().toLowerCase()),password:z.string().min(12).max(128),name:z.string().trim().min(1).max(80).optional(),adminCode:z.string().max(200).optional()});
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origen no permitido.'},{status:403});
 try{
  if(Number(req.headers.get('content-length')??0)>10000)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413});
  const text=await req.text();if(text.length>10000)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413});
  let body;try{body=credentials.safeParse(JSON.parse(text))}catch{return NextResponse.json({error:'Solicitud inválida.'},{status:400})}
  if(!body.success)return NextResponse.json({error:'Usá un email válido y una contraseña de 12 a 128 caracteres.'},{status:400});
  const {email,password,mode,name,adminCode}=body.data;
  if(!await rateLimit(req,email))return NextResponse.json({error:'Demasiados intentos. Esperá 15 minutos antes de volver a intentar.'},{status:429});
  if(mode==='login'){
   const user=await db.user.findUnique({where:{email}});
   const valid=await verifyPassword(password,user?.passwordHash??'scrypt:00000000000000000000000000000000:'+('0'.repeat(128)));
   if(!user||!valid)return NextResponse.json({error:'Email o contraseña incorrectos.'},{status:401});
   return startSession(user.id);
  }
  if(!name)return NextResponse.json({error:'Ingresá tu nombre.'},{status:400});
  if(email===ADMIN_EMAIL&&(!process.env.ACCESS_PASSWORD||!adminCode||!sameSecret(adminCode,process.env.ACCESS_PASSWORD)))return NextResponse.json({error:'Para activar el administrador, ingresá el código configurado en ACCESS_PASSWORD.'},{status:403});
  const passwordHash=await hashPassword(password);
  const user=await db.$transaction(async tx=>{
   const user=await tx.user.create({data:{email,name,passwordHash,role:email===ADMIN_EMAIL?'ADMIN':'USER'}});
   const claimed=email===ADMIN_EMAIL?await tx.tracker.updateMany({where:{id:'personal',ownerId:null},data:{ownerId:user.id}}):{count:0};
   if(!claimed.count)await tx.tracker.create({data:{ownerId:user.id,data:freshState()}});
   return user;
  });
  return startSession(user.id);
 }catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')return NextResponse.json({error:'No se pudo crear la cuenta. Si ya te registraste, iniciá sesión.'},{status:409});return NextResponse.json({error:'No se pudo completar el acceso. Reintentá en unos instantes.'},{status:503})}
}
