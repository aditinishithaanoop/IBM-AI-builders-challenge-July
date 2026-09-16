import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await auth.getSession();
  return Response.json(result);
}

//remove in production