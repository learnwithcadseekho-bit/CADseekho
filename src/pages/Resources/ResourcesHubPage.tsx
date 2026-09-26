import { Seo } from "@/components/Seo";
import { ResourceBrowser } from "./ResourceBrowser";
import { LearningPathTiles, MostUsedRow, TaxonomyIndex } from "./ResourceRows";
import { useResourceTaxonomy } from "@/hooks/useResourceTaxonomy";
import "@/styles/cards.css";
import "@/styles/resources.css";

export default function ResourcesHubPage() {
  const { software, topics, error } = useResourceTaxonomy();

  return (
    <>
      <Seo
        title="Engineering Resources — Calculators, Cheat Sheets & Tutorials"
        description="Search free and premium CAD/CAE resources: stress calculators, cheat sheets, solved problems and tutorials for SolidWorks, ANSYS, Creo, CATIA, NX and HyperMesh."
      />
      <header className="resources-hero container">
        <span className="mono-label">Resources</span>
        <h1 className="resources-hero__title">Solve by hand first, validate in software</h1>
        <p className="resources-hero__lead">
          Calculators, cheat sheets, solved problems and tutorials for every CAD and simulation tool we teach.
          Search by keyword or filter by software, topic and level.
        </p>
      </header>

      {error && <p className="section__status">Resources are temporarily unavailable. Please try again later.</p>}
      {!error && (!software || !topics) && <p className="section__status">Loading resources…</p>}

      {software && topics && (
        <>
          <ResourceBrowser
            software={software}
            topics={topics}
            idleContent={
              <>
                <LearningPathTiles softwareId={null} />
                <MostUsedRow softwareSlug={null} />
              </>
            }
          />
          <TaxonomyIndex software={software} topics={topics} />
          <div style={{ height: "var(--space-16)" }} />
        </>
      )}
    </>
  );
}
