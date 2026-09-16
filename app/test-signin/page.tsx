'use client';
import { authClient } from '@/lib/auth/client';

export default function TestSignIn() {
  return (
    <button
      onClick={() =>
        authClient.signIn.social({ provider: 'google', callbackURL: '/' })
      }
    >
      Sign in with Google
    </button>
  );
}