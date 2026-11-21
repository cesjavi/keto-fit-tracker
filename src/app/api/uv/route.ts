import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser,sameOrigin,digest} from '@/lib/auth';
import {db} from '@/lib/db';
import {UVForecast} from '@/lib/uv';
export const maxDuration=30;
const input=z.object({latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180),consent:z.literal(true)}).strict();
const rawForecast=z.object({timezone:z.string(),hourly:z.object({time:z.array(z.number().int().positive()),uv_index:z.array(z.number().finite().min(0).nullable()),is_day:z.array(z.number().min(0).max(1).nullable())}),daily:z.object({sunrise:z.array(z.number().nullable()),sunset:z.array(z.number().nullable())})});
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origen no permitido.'},{status:403});
 try{
  const user=await currentUser(req);if(!user)return NextResponse.json({error:'Iniciá sesión para consultar el índice UV.'},{status:401});
  const text=await req.text();if(text.length>500)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413});let parsed;try{parsed=input.safeParse(JSON.parse(text))}catch{return NextResponse.json({error:'Ubicación inválida.'},{status:400})}
  if(!parsed.success)return NextResponse.json({error:'Las coordenadas no son válidas.'},{status:400});
  const key=digest(`uv:${user.id}:${Math.floor(Date.now()/3600000)}`);const usage=await db.authAttempt.upsert({where:{key},create:{key,expiresAt:new Date(Date.now()+3600000)},update:{count:{increment:1}}});
  if(usage.count>30)return NextResponse.json({error:'Se alcanzó el límite de consultas UV de esta hora. Volvé a intentar más tarde.'},{status:429});
  const latitude=Math.round(parsed.data.latitude*100)/100,longitude=Math.round(parsed.data.longitude*100)/100;
  const apiKey=process.env.OPEN_METEO_API_KEY?.trim();
  const url=new URL(apiKey?'https://customer-api.open-meteo.com/v1/forecast':'https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),hourly:'uv_index,is_day',daily:'sunrise,sunset',forecast_days:'2',timezone:'auto',timeformat:'unixtime',...(apiKey?{apikey:apiKey}:{})}).toString();
  let response:Response;try{response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)})}catch{return NextResponse.json({error:'El servicio meteorológico no respondió. Volvé a intentar en unos minutos.'},{status:504})}
  if(!response.ok)return NextResponse.json({error:response.status===429?'El servicio meteorológico alcanzó su límite temporal. Reintentá más tarde.':'No se pudo obtener el pronóstico UV para esta zona.'},{status:response.status===429?429:502});
  const result=rawForecast.safeParse(await response.json());if(!result.success)return NextResponse.json({error:'El servicio no devolvió datos UV completos para esta ubicación.'},{status:502});
  const data=result.data;const {time,uv_index,is_day}=data.hourly;
  try{new Intl.DateTimeFormat('es',{timeZone:data.timezone}).format()}catch{return NextResponse.json({error:'La zona horaria del pronóstico no es válida.'},{status:502})}
  if(time.length!==uv_index.length||time.length!==is_day.length||time.length<24||!uv_index.some(n=>n!==null))return NextResponse.json({error:'No hay suficientes datos UV disponibles para esta zona.'},{status:502});
  const forecast:UVForecast={timezone:data.timezone,fetchedAt:Date.now(),hours:time.map((t,i)=>({startAt:(t-3600)*1000,endAt:t*1000,uv:uv_index[i],isDay:is_day[i]===null?null:is_day[i]===1})),sun:data.daily.sunrise.map((rise,i)=>{const sunset=data.daily.sunset[i];return {rise:rise!==null&&rise>0?rise*1000:null,set:sunset!==null&&sunset!==undefined&&sunset>0?sunset*1000:null}})};
  return NextResponse.json(forecast,{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'No se pudo consultar el índice UV. Reintentá más tarde.'},{status:503})}
}
