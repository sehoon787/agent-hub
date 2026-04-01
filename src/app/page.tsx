import { HeroSection } from '@/components/home/hero-section';
import { StatsSection } from '@/components/home/stats-section';
import { FeaturedSection } from '@/components/home/featured-section';
import { CategoriesSection } from '@/components/home/categories-section';
import { CompactRanking } from '@/components/home/compact-ranking';
import { LatestReleases } from '@/components/home/latest-releases';
import { WebSiteJsonLd } from '@/components/seo/json-ld';
import { getTopRepositories } from '@/lib/data';

export default async function HomePage() {
  const topRepos = await getTopRepositories(10);

  return (
    <>
      <WebSiteJsonLd />
      <HeroSection />
      <StatsSection />
      <section className="py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col"><CompactRanking repos={topRepos} /></div>
          <div className="flex flex-col"><LatestReleases /></div>
        </div>
      </section>
      <FeaturedSection />
      <CategoriesSection />
    </>
  );
}
