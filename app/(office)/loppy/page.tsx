import { redirect } from 'next/navigation';

/**
 * Alias for the lobby. Whatever the agent types — /loppy, /lobby, /house —
 * lands in the same room.
 */
export default function LoppyAlias() {
  redirect('/house');
}
