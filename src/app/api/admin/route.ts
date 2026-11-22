import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
export async function GET(req:NextRequest){try{const user=await currentUser(req);if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});if(user.role!=='ADMIN')return NextResponse.json({error:'Admin access only.'},{status:403});const users=await db.user.findMany({select:{id:true,name:true,email:true,role:true,createdAt:true},orderBy:{createdAt:'desc'},take:200});return NextResponse.json({users},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Could not load admin accounts.'},{status:503})}}
