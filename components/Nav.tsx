'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Top-level navigation entries; add new pages here to have them appear in the nav
const LINKS = [
  { href: '/', label: 'Dashboard', color: 'brand' },
  { href: '/meeting', label: 'Meeting to Action', color: 'meeting' },
  { href: '/proposal', label: 'Proposal Analyser', color: 'proposal' },
];

const ACTIVE_STYLES: Record<string, string> = {
   brand: 'bg-brand/15 text-brand',
   meeting: 'bg-meeting/15 text-meeting',
   proposal: 'bg-proposal/15 text-proposal',
};

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="print:hidden border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <div className="flex gap-1.5 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            <span className="h-2.5 w-2.5 rounded-full bg-meeting" />
            <span className="h-2.5 w-2.5 rounded-full bg-proposal" />
          </div>
        <span className="font-display text-xl font-medium text-foreground leading-tight">
            AI Project Co-worker</span>
        </div>
        <div className="flex gap-2">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                  active
                    ? `${ACTIVE_STYLES[l.color]} font-medium`
                    : 'text-muted-foreground hover:text-foreground hover:bg-background'
                }`}
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