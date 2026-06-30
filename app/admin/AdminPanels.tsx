import Link from 'next/link';

const panels = [
  { title: 'Diagnostyka aplikacji', href: '/admin/diagnostics' },
  { title: 'Dashboard oszczędności', href: '/savings' },
  { title: 'Opis dashboardów', href: '/dashboardy' }
];

export default function AdminPanels() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-black">Panele EnergyOptimizer</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {panels.map((panel) => (
          <Link key={panel.href} href={panel.href} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">{panel.title}</h2>
            <p className="mt-4 font-mono text-xs font-bold text-slate-400">{panel.href}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
