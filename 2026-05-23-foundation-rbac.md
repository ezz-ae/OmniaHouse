# Spec: Foundation & Role-Based Access Control (RBAC)

## Goal
Establish the "Digital Office" foundation. This includes a locked entrance (Auth), the organization-owner hierarchy, and the room-based navigation system that respects user permissions. This prevents the "empty system vs. jungle" problem by ensuring users only see what their role allows.

## Out of scope
- WhatsApp message extraction logic.
- Shopify/WooCommerce API syncing.
- AI Product Assistant implementation (UI placeholders only).

## Files to be touched
- `/supabase/migrations/20260523000000_init_rbac.sql` {role: new}
- `/middleware.ts`                                    {role: new}
- `/lib/rbac.ts`                                      {role: new}
- `/app/(auth)/login/page.tsx`                        {role: new}
- `/app/(office)/layout.tsx`                          {role: new}
- `/app/(office)/house/page.tsx`                      {role: new}
- `/components/navigation/sidebar.tsx`                {role: new}

## Schema delta
- Table `organizations`: `id, name, owner_id, settings`.
- Table `roles`: `id, name (Owner, Admin, Agent, etc.), description`.
- Table `permissions`: `id, slug (view_inventory, create_order, etc.)`.
- Table `user_roles`: `user_id, role_id, org_id`.
- Table `rooms`: `id, name, slug, icon, is_active`.
- Table `room_permissions`: `role_id, room_id, access_level`.

## Behaviour
1. **Locked Entrance:** Any unauthenticated request to `/house` or other office routes redirects to `/login`.
2. **Identity Awareness:** Upon login, the system fetches the user's role and associated permissions for the `omniastores` organization.
3. **Room-Based Navigation:** The sidebar renders dynamically. It only shows "Rooms" that the user has at least `view` permission for.
4. **Role Redirection:** The "Owner" role sees all room cards in the House Home; "Agents" see only the WhatsApp and Inventory cards.
5. **Audit Trail:** Every successful login and permission check failure is logged to `activity_logs`.

## RLS / permissions
- `Owner`: Full bypass of RLS (service-role level access within the app).
- `Other Roles`: Can only select from tables where `org_id` matches their assigned `org_id`.
- Refusal: If a user manually navigates to a URL for a room they don't own, the middleware intercepts and returns a 403 "Access Restricted" state.

## Tests
1. **Auth Gate:** Verify that accessing `/house` without a session redirects to `/login`.
2. **Role Masking:** Log in as "WhatsApp Agent" and verify the "Finance Room" is not visible in the sidebar.
3. **Org Isolation:** Verify that a user from Org A cannot query products from Org B (multi-tenant safety).
4. **Audit Log:** Verify that a login event creates a row in `activity_logs`.

## Open questions for Mahmoud
1. **Primary Auth Provider:** I've assumed Supabase Auth for speed and RLS integration. Is this approved? (Suggested: Yes)
2. **Initial Admin:** How should we handle the very first "Owner" creation? (Suggested: A manual seed script for `admin@omniastores.ae`).
3. **Restricted Room UI:** Should unauthorized rooms be hidden entirely or shown as "Locked" to pique interest/show scale? (Suggested: Hidden for Agents, Locked/Coming Soon for Admins).

**Status: Pending Mahmoud's Approval**