import { Link, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ResourceBrowser } from "./ResourceBrowser";
import { useResourceTaxonomy } from "@/hooks/useResourceTaxonomy";
import NotFoundPage from "@/pages/NotFound/NotFoundPage";
import { RESOURCE_TYPE_PLURALS, RESOURCE_TYPES, type ResourceType } from "@/types/resource";
import "@/styles/cards.css";
import "@/styles/resources.css";

/** /resources/topic/:topic and /resources/type/:type — a hero plus a pre-filtered browser. */
export default function ResourceTaxonomyPage({ kind }: { kind: "topic" | "type" }) {
  const { value } = useParams<{ value: string }>();
  const { software, topics, error } = useResourceTaxonomy();

  if (error) return <p className="section__status">Resources are temporarily unavailable. Please try again later.</p>;
  if (!software || !topics) return <p className="section__status">Loading…</p>;

  let title: string;
  let description: string;
  if (kind === "topic") {
    const topic = topics.find((t) => t.slug === value);
    if (!topic) return <NotFoundPage />;
    title = topic.name;
    description =
      topic.description ?? `${topic.name} resources across every CAD and simulation tool — hand calcs and software tutorials.`;
  } else {
    if (!RESOURCE_TYPES.includes(value as ResourceType)) return <NotFoundPage />;
    title = RESOURCE_TYPE_PLURALS[value as ResourceType];
    description = `All ${title.toLowerCase()} on CADseekho, across SolidWorks, ANSYS, Creo, CATIA, NX and more.`;
  }

  return (
    <>
      <Seo title={`${title} — Engineering Resources`} description={description} />
      <header className="resources-hero container">
        <nav className="resources-breadcrumb mono-label" aria-label="Breadcrumb">
          <Link to="/resources">Resources</Link>
          <span aria-hidden="true">/</span>
          <span>{kind === "topic" ? "Topic" : "Type"}</span>
        </nav>
        <h1 className="resources-hero__title">{title}</h1>
        <p className="resources-hero__lead">{description}</p>
      </header>

      <ResourceBrowser
        key={`${kind}:${value}`}
        software={software}
        topics={topics}
        fixed={{ [kind]: value! }}
        searchLabel={`Search ${title.toLowerCase()}`}
      />
    </>
  );
}
