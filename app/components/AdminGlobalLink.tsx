import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import { isAdminUser } from '../../lib/adminAccess';

export default function AdminGlobalLink() {
  const { userId } = auth();

  if (!isAdminUser(userId)) return null;

  return (
    <Link
      href="/admin"
      className="fixed bottom-4 right-4 z-50 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-lg transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      aria-label="Otwórz panele admina"
    >
      Panel admina
    </Link>
  );
}
