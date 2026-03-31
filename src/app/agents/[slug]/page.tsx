import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, ChevronRight, Bot, BadgeCheck, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAgent, getRelatedAgents, getAllAgentSlugs } from '@/lib/data';
import { InstallCommand } from '@/components/detail/install-command';
import { CapabilityList } from '@/components/detail/capability-list';
import { RelatedAgents } from '@/components/detail/related-items';
import { AgentJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { AgentDisplayName } from '@/components/ui/agent-display-name';
import { FavoriteButton } from '@/components/favorites/favorite-button';

const modelColors: Record<string, string> = {
  opus: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  sonnet: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  haiku: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const stageColors: Record<string, string> = {
  discover: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  plan: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  implement: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
  review: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  verify: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  debug: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  operate: 'bg-stone-500/20 text-stone-300 border-stone-500/30',
};

const stageLabels: Record<string, string> = {
  discover: 'Discover',
  plan: 'Plan',
  implement: 'Implement',
  review: 'Review',
  verify: 'Verify',
  debug: 'Debug',
  operate: 'Operate',
};

const platformColors: Record<string, string> = {
  claude: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  gemini: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  codex: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  universal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export async function generateStaticParams() {
  return getAllAgentSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent) return { title: 'Agent Not Found' };
  return {
    title: agent.displayName,
    description: agent.description,
    openGraph: {
      title: `${agent.displayName} — AgentHub`,
      description: agent.description,
      type: 'article',
    },
  };
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent) notFound();

  const related = getRelatedAgents(slug);
  const repoMatch = agent.githubUrl?.match(/github\.com\/([^/]+\/[^/]+)/);
  const repoKey = repoMatch?.[1];

  // Prefer a direct file URL for "View Source". If githubUrl is only a repo URL,
  // derive the blob URL from the installCommand (raw.githubusercontent.com → github.com/blob).
  const viewSourceUrl = (() => {
    if (!agent.githubUrl) return undefined;
    if (agent.githubUrl.includes('/blob/')) return agent.githubUrl;
    if (agent.installCommand) {
      const rawMatch = agent.installCommand.match(
        /https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+\.md)/
      );
      if (rawMatch) {
        return `https://github.com/${rawMatch[1]}/blob/${rawMatch[2]}/${rawMatch[3]}`;
      }
    }
    return agent.githubUrl;
  })();

  return (
    <div className="py-8">
      <AgentJsonLd agent={agent} />
      <BreadcrumbJsonLd agent={agent} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-zinc-500">
        <Link href="/agents" className="hover:text-zinc-300">Agents</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-zinc-300"><AgentDisplayName displayName={agent.displayName} variant="inline" /></span>
      </nav>

      {/* Header */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Bot className="h-8 w-8 shrink-0 text-violet-400" />
            <h1 className="text-3xl font-bold text-zinc-100"><AgentDisplayName displayName={agent.displayName} variant="inline" /></h1>
            {agent.verified && (
              <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400" aria-label="Verified" />
            )}
            <Badge variant="outline" className={platformColors[agent.platform]}>
              {agent.platform}
            </Badge>
            <Badge variant="outline" className={modelColors[agent.model]}>
              {agent.model}
            </Badge>
          </div>
          <p className="mt-2 max-w-2xl text-zinc-400">{agent.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">{agent.category}</Badge>
            <Badge variant="secondary" className="capitalize">{agent.source}</Badge>
            {agent.stages?.map((s) => (
              <Badge key={s} variant="outline" className={stageColors[s] ?? ''}>
                {stageLabels[s] ?? s}
              </Badge>
            ))}
            {agent.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="border-zinc-700 text-zinc-500">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <FavoriteButton slug={agent.slug} />
          {repoKey && (
            <Link
              href={`/agents?repo=${repoKey}`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              <Package className="h-4 w-4" />
              {repoKey}
            </Link>
          )}
          {viewSourceUrl && (
            <a
              href={viewSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              <ExternalLink className="h-4 w-4" />
              View Source
            </a>
          )}
        </div>
      </div>

      {/* Install */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">Install</h2>
        <InstallCommand command={agent.installCommand} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="border-zinc-800 bg-zinc-900">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {agent.longDescription}
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Capabilities</h2>
            <div className="mt-2">
              <CapabilityList items={agent.capabilities} />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Tools</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {agent.tools.map((tool) => (
                <Badge key={tool} variant="outline" className="border-zinc-700 font-mono text-xs text-zinc-400">
                  {tool}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Agent Definition</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Example frontmatter for your agent .md file:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
{`---
name: ${agent.name}
displayName: ${agent.displayName}
model: ${agent.model}
category: ${agent.category}
source: ${agent.source}
description: >
  ${agent.description}
capabilities:
${agent.capabilities.map((c) => `  - ${c}`).join('\n')}
tools:
${agent.tools.map((t) => `  - ${t}`).join('\n')}
---

${agent.longDescription}`}
            </pre>
          </div>
        </TabsContent>
      </Tabs>

      <RelatedAgents agents={related} />
    </div>
  );
}
