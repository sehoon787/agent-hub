import type { Agent } from "@/lib/types"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://agent-hub.vercel.app"

export function WebSiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AgentHub",
    url: siteUrl,
    description:
      "The open-source registry for discovering and sharing AI coding agents across Claude Code, Gemini CLI, and Codex CLI.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function CollectionPageJsonLd({
  count,
}: {
  count: number
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Browse AI Coding Agents",
    url: `${siteUrl}/agents`,
    description: `Discover ${count} AI coding agents — orchestrators, specialists, workers, and analysts across Claude, Gemini, and Codex.`,
    isPartOf: { "@type": "WebSite", name: "AgentHub", url: siteUrl },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function AgentJsonLd({ agent }: { agent: Agent }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: agent.displayName,
    description: agent.description,
    url: `${siteUrl}/agents/${agent.slug}`,
    author: {
      "@type": "Person",
      name: agent.author,
    },
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
