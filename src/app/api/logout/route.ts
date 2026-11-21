import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {COOKIE,digest,sameOrigin} from '@/lib/auth';
export async function POST(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origen no permitido.'},{status:403});const token=req.cookies.get(COOKIE)?.value;if(token)await db.session.deleteMany({where:{tokenHash:digest(token)}});const res=NextResponse.redirect(new URL('/login',req.url),303);res.cookies.delete(COOKIE);res.cookies.delete('ketofit_session');return res}
