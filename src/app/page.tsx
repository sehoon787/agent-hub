import { HeroSection } from '@/components/home/hero-section';
import { StatsSection } from '@/components/home/stats-section';
import { FeaturedSection } from '@/components/home/featured-section';
import { CategoriesSection } from '@/components/home/categories-section';
import { CompactRanking } from '@/components/home/compact-ranking';
import { LatestReleases } from '@/components/home/latest-releases';
import { WebSiteJsonLd } from '@/components/seo/json-ld';
import { getTopAgentsByStars } from '@/lib/data';

export default function HomePage() {
  const topAgents = getTopAgentsByStars(20);

  return (
    <>
      <WebSiteJsonLd />
      <HeroSection />
      <StatsSection />
      <section className="py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CompactRanking agents={topAgents} />
          <LatestReleases />
        </div>
      </section>
      <FeaturedSection />
      <CategoriesSection />
    </>
  );
}
