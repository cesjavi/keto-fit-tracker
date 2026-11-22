import {NextRequest,NextResponse} from 'next/server';
export function proxy(req:NextRequest){
 const path=req.nextUrl.pathname;
 if(path==='/login'||path==='/pitch'||path.startsWith('/brand/')||path==='/api/auth'||path.startsWith('/_next/'))return NextResponse.next();
 if(req.cookies.get('ketofit_account')?.value)return NextResponse.next();
 if(path.startsWith('/api/'))return NextResponse.json({error:'Iniciá sesión para acceder a tus datos.'},{status:401});
 return NextResponse.redirect(new URL('/login',req.url));
}
export const config={matcher:['/((?!favicon.ico|icon.png|apple-icon.png|icon-192.png|icon-512.png|manifest.webmanifest|offline.html|sw.js).*)']};
