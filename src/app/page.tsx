import {cookies} from 'next/headers';import {NextRequest} from 'next/server';import {redirect} from 'next/navigation';import {currentUser} from '@/lib/auth';import Tracker from '@/components/tracker';
export const dynamic='force-dynamic';
export default async function Page(){const c=await cookies();const req=new NextRequest('http://internal/',{headers:{cookie:c.toString()}});const user=await currentUser(req);if(!user)redirect('/login');return <Tracker/>}
