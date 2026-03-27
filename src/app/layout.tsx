import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Analytics } from '@vercel/analytics/react';
import { Providers } from './providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agent-hub.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AgentHub — Discover & Share AI Coding Agents',
    template: '%s | AgentHub',
  },
  description:
    'The open-source registry for discovering and sharing AI coding agents across Claude Code, Gemini CLI, and Codex CLI.',
  keywords: ['AI coding agents', 'Claude Code', 'Gemini CLI', 'Codex CLI', 'AI tools', 'agent registry', 'developer tools'],
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  openGraph: {
    title: 'AgentHub',
    description: 'Discover & Share AI Coding Agents across Claude, Gemini, and Codex',
    siteName: 'AgentHub',
    type: 'website',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentHub',
    description: 'Discover & Share AI Coding Agents across Claude, Gemini, and Codex',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased`}
      >
        <Providers>
          <Header />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </main>
          <Footer />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
