import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function getUserRooms() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get the user's role first
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', user.id)
    .single();

  if (!userRole) return [];

  const { data: rooms, error } = await supabase
    .from('rooms')
    .select(`
      id, name, slug, icon,
      room_permissions!inner(role_id)
    `)
    .eq('room_permissions.role_id', userRole.role_id)
    .order('sort_order', { ascending: true });

  if (error) return [];
  return rooms;
}