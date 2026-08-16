import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getPublicDownloadUrl, getSignedDownloadUrl, logDownload } from "@/services/downloadService";
import type { Download } from "@/types/download";

// Section 12 flow: click Download -> if not logged in and the resource
// requires login, send to /login -> after auth, generate a URL and log it.
// The actual login gate is enforced by storage RLS (see the Phase 7
// migration), not just this component.
export function DownloadButton({ download }: { download: Download }) {
  const { session, user } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  if (download.requires_login && !session) {
    return (
      <Link to="/login" state={{ from: location }} className="btn btn--outline btn--sm">
        Login to Download
      </Link>
    );
  }

  async function handleClick() {
    setStatus("working");
    try {
      const url = download.requires_login
        ? await getSignedDownloadUrl(download.file_path)
        : getPublicDownloadUrl(download.file_path);

      if (user) {
        await logDownload(download.id, user.id).catch(() => {
          // Logging failure shouldn't block the file the user already earned.
        });
      }

      window.open(url, "_blank", "noopener,noreferrer");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      {status === "error" && <p className="field__error">Download failed. Please try again.</p>}
      <button
        type="button"
        className="btn btn--primary btn--sm"
        onClick={handleClick}
        disabled={status === "working"}
      >
        {status === "working" ? "Preparing…" : "Download"}
      </button>
    </div>
  );
}
