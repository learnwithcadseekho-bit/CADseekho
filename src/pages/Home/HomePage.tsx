import { Seo } from "@/components/Seo";
import { HeroSection } from "./HeroSection";
import { LogoSection } from "./LogoSection";
import { CategorySection } from "./CategorySection";
import { FeaturedCoursesSection } from "./FeaturedCoursesSection";
import { WhySection } from "./WhySection";

export default function HomePage() {
  return (
    <>
      <Seo
        title="Learn CAD. Build Skills. Solve Real Engineering Problems."
        description="Practical CAD and engineering training designed for students, engineers, designers, and working professionals — AutoCAD, SolidWorks, and more."
      />
      <HeroSection />
      <LogoSection />
      <CategorySection />
      <FeaturedCoursesSection />
      <WhySection />
    </>
  );
}
