import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DownloadButton } from "@/components/DownloadButton";
import { getMyDownloadHistory, type DownloadLogWithResource } from "@/services/downloadService";
import { formatDate } from "@/utils/formatDate";

export function DownloadsTab() {
  const { user } = useAuth();
  const [history, setHistory] = useState<DownloadLogWithResource[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMyDownloadHistory(user.id)
      .then(setHistory)
      .catch(() => setError(true));
  }, [user]);

  if (error) return <p className="section__status">Couldn't load your downloads. Please try again later.</p>;
  if (history === null) return <p className="section__status">Loading…</p>;

  if (history.length === 0) {
    return (
      <div className="dashboard-empty">
        <p>You haven't downloaded any resources yet.</p>
        <Link to="/downloads" className="btn btn--primary">
          Browse Free Downloads
        </Link>
      </div>
    );
  }

  return (
    <ul className="dashboard-list">
      {history.map((log) => (
        <li key={log.id} className="dashboard-list__item">
          <div>
            {log.download?.category && <span className="mono-label">{log.download.category}</span>}
            <p className="dashboard-list__title">{log.download?.title ?? "Resource"}</p>
          </div>
          <div className="dashboard-list__meta">
            <span className="mono-label">{formatDate(log.downloaded_at)}</span>
            {log.download && <DownloadButton download={log.download} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
