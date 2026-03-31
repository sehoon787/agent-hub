'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { AuthButton } from '@/components/auth/auth-button';

const navLinks: { href: string; label: string }[] = [
  { href: '/agents', label: 'Agents' },
  { href: '/submit', label: 'Submit' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="AgentHub" className="h-7 w-7" />
          <span className="text-lg font-bold text-zinc-100">
            AgentHub
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(link.href)
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100'
              )}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/sehoon787/agent-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100"
          >
            GitHub
          </a>
          <div className="ml-2 border-l border-zinc-800 pl-3">
            <AuthButton />
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 md:hidden">
          <AuthButton />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="text-zinc-400 hover:text-zinc-100" aria-label="Menu">
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </SheetTrigger>
            <SheetContent side="right" className="w-64 border-zinc-800 bg-zinc-950">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <nav className="mt-8 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      pathname.startsWith(link.href)
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-100'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
