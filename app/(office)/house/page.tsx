// Scaffolding stub. House Home — renders role-filtered room cards.
// Full implementation per docs/specs/2026-05-23-foundation-rbac.md.

import { getUserRooms } from '@/lib/rbac';

export default async function HouseHomePage() {
  const rooms = await getUserRooms();

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-6">House</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Rooms visible to you ({rooms.length}). Full card UI to be implemented per the foundation-rbac spec.
      </p>
      <ul className="space-y-2">
        {rooms.map((room: any) => (
          <li key={room.slug} className="border rounded p-3">
            <a href={`/${room.slug}`}>{room.name}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
