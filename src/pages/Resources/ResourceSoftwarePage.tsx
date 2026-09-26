import { Link, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ResourceBrowser } from "./ResourceBrowser";
import { LearningPathTiles, MostUsedRow } from "./ResourceRows";
import { useResourceTaxonomy } from "@/hooks/useResourceTaxonomy";
import NotFoundPage from "@/pages/NotFound/NotFoundPage";
import "@/styles/cards.css";
import "@/styles/resources.css";

export default function ResourceSoftwarePage() {
  const { software: slug } = useParams<{ software: string }>();
  const { software, topics, error } = useResourceTaxonomy();

  if (error) return <p className="section__status">Resources are temporarily unavailable. Please try again later.</p>;
  if (!software || !topics) return <p className="section__status">Loading…</p>;

  const tool = software.find((s) => s.slug === slug);
  if (!tool) return <NotFoundPage />;

  return (
    <>
      <Seo
        title={`${tool.name} Resources — Tutorials, Cheat Sheets & Calculators`}
        description={tool.description ?? `${tool.name} resources from CADseekho.`}
      />
      <header className="resources-hero container">
        <nav className="resources-breadcrumb mono-label" aria-label="Breadcrumb">
          <Link to="/resources">Resources</Link>
          <span aria-hidden="true">/</span>
          <span>Software</span>
        </nav>
        <h1 className="resources-hero__title">{tool.name}</h1>
        {tool.description && <p className="resources-hero__lead">{tool.description}</p>}
        {tool.course_url && (
          <div className="resources-hero__actions">
            <Link to={tool.course_url} className="btn btn--primary">
              {tool.name} courses →
            </Link>
          </div>
        )}
      </header>

      <div className="container">
        <LearningPathTiles softwareId={tool.id} title={`Start here: ${tool.name}`} />
        <MostUsedRow softwareSlug={tool.slug} />
      </div>

      <ResourceBrowser
        software={software}
        topics={topics}
        fixed={{ software: tool.slug }}
        searchLabel={`Search ${tool.name} resources`}
      />
    </>
  );
}
