/**
 * The "current user" for the prototype phase.
 *
 * Once Supabase is wired (Phase 2+), this gets replaced by a real session
 * reader. For now, the whole UI assumes the signed-in user has full access.
 * Roles are still respected in the UI so we can stress-test the RBAC mock.
 */

export type Session = {
  user: {
    id: string;
    name: string;
    role: 'owner' | 'admin' | 'whatsapp_manager' | 'whatsapp_agent' | 'marketing' | 'strategy' | 'finance';
    avatarColor: string;
  };
  org: {
    id: string;
    name: string;
    handle: string;
  };
};

export const MOCK_SESSION: Session = {
  user: {
    id: 'u_mahmoud',
    name: 'Mahmoud',
    role: 'owner',
    avatarColor: '#D4A574',
  },
  org: {
    id: 'o_omnia',
    name: 'House of Omnia',
    handle: 'omnia',
  },
};

export function getSession(): Session {
  // TODO(phase-2): read from Supabase via @supabase/auth-helpers-nextjs
  return MOCK_SESSION;
}
