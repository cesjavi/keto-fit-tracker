import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser,ADMIN_EMAIL} from '@/lib/auth';
export async function GET(req:NextRequest){try{const user=await currentUser(req);if(!user)return NextResponse.json({error:'Iniciá sesión.'},{status:401});if(user.role!=='ADMIN'||user.email!==ADMIN_EMAIL)return NextResponse.json({error:'Acceso exclusivo de administración.'},{status:403});const users=await db.user.findMany({select:{id:true,name:true,email:true,role:true,createdAt:true},orderBy:{createdAt:'desc'},take:200});return NextResponse.json({users},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'No se pudo consultar la administración.'},{status:503})}}
