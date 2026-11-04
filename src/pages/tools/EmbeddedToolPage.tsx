import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { absoluteUrl } from "@/config/site";
import { faqSchema, ORGANIZATION_ID } from "@/lib/schema";
import type { EmbeddedTool } from "./embeddedTools";
import { ToolFrame } from "./ToolFrame";
import "@/styles/cards.css";
import "@/styles/resources.css";
import "./tools.css";

// One page template for the static tools listed in embeddedTools.ts — same
// layout as BeamCalculatorPage: hero, embedded tool, indexable guide + FAQ.
export default function EmbeddedToolPage({ tool }: { tool: EmbeddedTool }) {
  const path = `/tools/${tool.slug}`;

  return (
    <>
      <Seo
        title={tool.seoTitle}
        description={tool.seoDescription}
        canonical={path}
        breadcrumbs={[
          { name: "Resources", path: "/resources" },
          { name: tool.title, path },
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: `CADseekho ${tool.title}`,
            url: absoluteUrl(path),
            applicationCategory: "EngineeringApplication",
            operatingSystem: "Any (web browser)",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: 0, priceCurrency: "INR" },
            provider: { "@type": "EducationalOrganization", "@id": ORGANIZATION_ID, name: "CADseekho" },
          },
          faqSchema(tool.faqs)!,
        ]}
      />
      <header className="resources-hero container">
        <span className="mono-label">Free tool</span>
        <h1 className="resources-hero__title">{tool.title}</h1>
        <p className="resources-hero__lead">{tool.lead}</p>
      </header>

      <section className="tool-section container">
        <ToolFrame src={`/tools/${tool.slug}.html?embed=1`} title={tool.title} />
      </section>

      <section className="tool-guide container">
        <h2>What it does</h2>
        <p>{tool.intro}</p>

        <h2>How to use it</h2>
        <ol>
          {tool.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <h2>Solve by hand first, then validate</h2>
        <p>
          Every result comes with the working, so you can follow the formulas instead of trusting a black box — the
          same method we teach in our <Link to="/courses/ansys-workbench-foundation">ANSYS Workbench course</Link>.
          Browse more free calculators and references in <Link to="/resources">Resources</Link>.
        </p>

        <h2>Frequently asked questions</h2>
        <div className="tool-faq">
          {tool.faqs.map((f) => (
            <details key={f.question}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
