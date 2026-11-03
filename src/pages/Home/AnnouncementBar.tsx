import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SW_SIM } from "@/content/swSimulation";

const DISMISS_KEY = "cs_dismissed_announcement";
// Change when the announcement changes, so a new one shows even to people who dismissed the last.
const ANNOUNCEMENT_ID = "sw-sim-launch-2026-11";

/** Dismissible strip above the homepage hero. Shown in the prerendered HTML; hidden after hydration if dismissed. */
export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === ANNOUNCEMENT_ID) setDismissed(true);
    } catch {
      // storage blocked: keep showing it
    }
  }, []);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, ANNOUNCEMENT_ID);
    } catch {
      // storage blocked: hidden for this visit only
    }
  }

  return (
    <aside className="announcement" aria-label="Announcement">
      <div className="container announcement__inner">
        <Link to={SW_SIM.path} className="announcement__link">
          <span className="announcement__tag">New</span>
          <span>{SW_SIM.announcement.replace(/^New:\s*/, "")} →</span>
        </Link>
        <button type="button" className="announcement__close" onClick={dismiss} aria-label="Dismiss announcement">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
