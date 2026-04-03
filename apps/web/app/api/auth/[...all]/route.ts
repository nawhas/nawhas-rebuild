import { auth } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const handler = (req: NextRequest): Promise<Response> => auth.handler(req);

export { handler as GET, handler as POST };
