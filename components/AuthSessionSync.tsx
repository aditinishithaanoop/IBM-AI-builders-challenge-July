'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 600;

export default function AuthSessionSync() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasVerifier = searchParams.has('neon_auth_session_verifier');

  useEffect(() => {
    async function completeSignIn(attempt = 1) {
      const { data: sessionData } = await authClient.getSession();

      if (!sessionData?.user) {
        if (hasVerifier && attempt < MAX_ATTEMPTS) {
          setTimeout(() => completeSignIn(attempt + 1), RETRY_DELAY_MS);
        }
        return;
      }

      if (!sessionData.session.activeOrganizationId) {
        const { data: orgs } = await authClient.organization.list();
        let orgId = orgs?.[0]?.id;

        if (!orgId) {
          const { data: newOrg } = await authClient.organization.create({
            name: `${sessionData.user.name ?? sessionData.user.email}'s Workspace`,
            slug: `org-${sessionData.user.id.slice(0, 8)}`,
          });
          orgId = newOrg?.id;
        }

        if (orgId) {
          await authClient.organization.setActive({ organizationId: orgId });
        }
      }

      // Strip the verifier param from the URL now that we're done with it
      if (hasVerifier) router.replace(window.location.pathname);
    }

    completeSignIn();
  }, [hasVerifier, router]);

  return null;
}