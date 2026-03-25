import { HeroSection } from '@/components/home/hero-section';
import { StatsSection } from '@/components/home/stats-section';
import { FeaturedSection } from '@/components/home/featured-section';
import { CategoriesSection } from '@/components/home/categories-section';
import { VisitorCounter } from '@/components/home/visitor-counter';
import { WebSiteJsonLd } from '@/components/seo/json-ld';

export default function HomePage() {
  return (
    <>
      <WebSiteJsonLd />
      <HeroSection />
      <div className="flex justify-center pb-4">
        <VisitorCounter />
      </div>
      <StatsSection />
      <FeaturedSection />
      <CategoriesSection />
    </>
  );
}
