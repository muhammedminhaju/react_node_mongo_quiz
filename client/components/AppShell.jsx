'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { loadSettings } from '@/lib/storage';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/quiz', label: 'Quiz' },
  { href: '/revision', label: 'Revision' },
  { href: '/topic-reviews', label: 'Topic Reviews' },
  { href: '/history', label: 'History' },
  { href: '/reports', label: 'Reports' },
  { href: '/questions', label: 'Question Management' },
  { href: '/topics', label: 'Topics' },
  { href: '/settings', label: 'Settings' }
];

export default function AppShell({ title, actions, children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const settings = loadSettings();
    document.body.classList.toggle('dark-mode', Boolean(settings.darkMode));
  }, []);

  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">Q</div>
          <div>
            <h2>Quiz App</h2>
          </div>
        </div>
        <nav className="nav-links">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button type="button" className="mobile-menu" onClick={() => setMobileOpen((open) => !open)}>
            ☰
          </button>
          <div className="topbar-title">{title}</div>
          <div className="topbar-actions">{actions}</div>
        </header>

        {children}
      </main>
    </div>
  );
}
