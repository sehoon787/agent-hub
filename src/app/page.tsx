import { HeroSection } from '@/components/home/hero-section';
import { StatsSection } from '@/components/home/stats-section';
import { FeaturedSection } from '@/components/home/featured-section';
import { RankingSection } from '@/components/home/ranking-section';
import { CategoriesSection } from '@/components/home/categories-section';
import { WebSiteJsonLd } from '@/components/seo/json-ld';

export default function HomePage() {
  return (
    <>
      <WebSiteJsonLd />
      <HeroSection />
      <StatsSection />
      <FeaturedSection />
      <RankingSection />
      <CategoriesSection />
    </>
  );
}
