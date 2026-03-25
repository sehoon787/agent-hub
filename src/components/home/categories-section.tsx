import Link from 'next/link';
import { Bot, Users, Wrench, Eye } from 'lucide-react';

const categories = [
  { href: '/agents?category=orchestrator', label: 'Orchestrators', description: 'Meta-agents that coordinate multi-agent workflows and delegate tasks', icon: Users, color: 'text-violet-400' },
  { href: '/agents?category=specialist', label: 'Specialists', description: 'Domain experts with deep knowledge in specific areas', icon: Wrench, color: 'text-blue-400' },
  { href: '/agents?category=worker', label: 'Workers', description: 'Execution-focused agents that implement and ship code', icon: Bot, color: 'text-emerald-400' },
  { href: '/agents?category=analyst', label: 'Analysts', description: 'Read-only advisors providing analysis and strategic guidance', icon: Eye, color: 'text-amber-400' },
];

export function CategoriesSection() {
  return (
    <section className="py-12">
      <h2 className="text-2xl font-semibold text-zinc-100">Browse by Category</h2>
      <p className="mt-1 text-sm text-zinc-400">Find the right agent for your workflow</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {categories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="group flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
          >
            <div className={`rounded-lg bg-zinc-800 p-2.5 ${cat.color}`}>
              <cat.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 group-hover:text-white">{cat.label}</h3>
              <p className="mt-1 text-sm text-zinc-400">{cat.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
