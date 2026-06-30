import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { isAdminUser } from '../../lib/adminAccess';
import AdminPanels from './AdminPanels';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const { userId } = auth();
  if (!isAdminUser(userId)) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8">
      <AdminPanels />
    </main>
  );
}
