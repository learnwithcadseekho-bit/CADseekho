import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DownloadCard } from "@/components/ui/DownloadCard";
import { getPublishedDownloads } from "@/services/downloadService";
import type { Download } from "@/types/download";
import "@/styles/cards.css";
import "./downloads.css";

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPublishedDownloads()
      .then(setDownloads)
      .catch(() => setError(true));
  }, []);

  return (
    <section className="section container">
      <Seo
        title="Free Engineering Resources"
        description="Free CAD practice drawings, SolidWorks and AutoCAD files, GD&T references, and engineering guides. Some downloads require a free account."
      />
      <SectionHeading
        title="Free Engineering Resources"
        subtitle="Practice drawings, CAD files, guides, and reference material. Some resources require a free account to download."
        align="center"
        as="h1"
      />

      {error && <p className="section__status">Downloads are temporarily unavailable. Please try again later.</p>}
      {!error && downloads === null && <p className="section__status">Loading resources…</p>}
      {!error && downloads?.length === 0 && <p className="section__status">No resources are published yet.</p>}

      {!error && downloads && downloads.length > 0 && (
        <div className="download-grid">
          {downloads.map((d, i) => (
            <DownloadCard key={d.id} download={d} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
