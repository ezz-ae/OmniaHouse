import { redirect } from 'next/navigation';

export default function RootPage() {
  // Middleware decides login vs. house. If both pass, land at house.
  redirect('/house');
}
