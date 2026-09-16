import { auth } from '@/lib/auth/server';

export async function requireOrgSession() {
  const { data } = await auth.getSession();
  if (!data?.user || !data.session.activeOrganizationId) {
    return null;
  }
  return {
    userId: data.user.id as string,
    organizationId: data.session.activeOrganizationId as string,
  };
}