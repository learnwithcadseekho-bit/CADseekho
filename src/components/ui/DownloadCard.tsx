import { DownloadButton } from "@/components/DownloadButton";
import { PlaceholderArt } from "./PlaceholderArt";
import { formatFileSize } from "@/utils/formatFileSize";
import type { Download } from "@/types/download";
import "@/styles/drafting.css";

export function DownloadCard({ download, index }: { download: Download; index: number }) {
  return (
    <div className="download-card drafting-frame drafting-frame--interactive">
      {download.thumbnail ? (
        <img
          src={download.thumbnail}
          alt={download.title}
          className="download-card__image"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <PlaceholderArt label={download.file_type?.toUpperCase() ?? "FILE"} seed={index} />
      )}
      <div className="download-card__body">
        {download.category && <span className="mono-label">{download.category}</span>}
        <h3 className="download-card__title">{download.title}</h3>
        {download.description && <p className="download-card__desc">{download.description}</p>}
        <div className="download-card__meta mono-label">
          {download.file_type && <span>{download.file_type.toUpperCase()}</span>}
          <span>{formatFileSize(download.file_size)}</span>
          {download.requires_login && <span>Login Required</span>}
        </div>
        <div className="download-card__footer">
          <DownloadButton download={download} />
        </div>
      </div>
    </div>
  );
}
