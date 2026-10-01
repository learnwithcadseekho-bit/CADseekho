import { Seo } from "@/components/Seo";
import { HeroSection } from "./HeroSection";
import { FeaturedCoursesSection } from "./FeaturedCoursesSection";
import { LocalTrainingSection } from "./LocalTrainingSection";
import { WhySection } from "./WhySection";

export default function HomePage() {
  return (
    <>
      <Seo
        title="ANSYS Training in Delhi NCR | FEA & CAD Courses – CADseekho"
        description="ANSYS Workbench & FEA training in Delhi NCR and online. Solve by hand first, then validate in ANSYS. Live batches, plus SolidWorks, Creo & AutoCAD."
        canonical="/"
      />
      <HeroSection />
      <FeaturedCoursesSection />
      <LocalTrainingSection />
      <WhySection />
    </>
  );
}
