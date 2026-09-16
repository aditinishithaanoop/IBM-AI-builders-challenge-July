import { auth } from '@/lib/auth/server';

export default auth.middleware({
  loginUrl: '/sign-in',
});

export const config = {
  matcher: [
    '/((?!sign-in|api(?:/|$)|test-signin|_next/static|_next/image|favicon.ico).*)',
  ],
};