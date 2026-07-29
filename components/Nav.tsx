'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/meeting', label: 'Meeting → Action Items' },
  { href: '/proposal', label: 'Proposal Analyser' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="print:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-3 flex items-center gap-6">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Project Co-worker</span>
        <div className="flex gap-4">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm ${active ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}