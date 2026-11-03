import { Seo } from "@/components/Seo";
import { HeroSection } from "./HeroSection";
import { FeaturedCoursesSection } from "./FeaturedCoursesSection";
import { MethodSection } from "./MethodSection";
import { WhySection } from "./WhySection";
import { AnnouncementBar } from "./AnnouncementBar";

export default function HomePage() {
  return (
    <>
      <Seo
        title="Online ANSYS & FEA Training | CAD Courses – CADseekho"
        description="Live online ANSYS Workbench & FEA training: solve by hand first, then validate in ANSYS. Plus SolidWorks, Creo & AutoCAD courses for engineers."
        canonical="/"
      />
      <AnnouncementBar />
      <HeroSection />
      <FeaturedCoursesSection />
      <MethodSection />
      <WhySection />
    </>
  );
}
