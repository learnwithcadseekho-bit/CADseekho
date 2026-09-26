import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { logResourceEvent } from "@/services/resourceService";
import "@/styles/resources.css";

interface LockedPanelProps {
  resourceId: string;
  title?: string;
  /** Short line on what's behind the lock. */
  children?: React.ReactNode;
  /** Static, generic preview image — never a render of the real locked content. */
  preview?: string;
}

// Placeholder for locked content. Everything shown here is static: the real
// content is never sent to this browser (RLS on resource_premium).
export function LockedPanel({
  resourceId,
  title = "The rest is for CADseekho students",
  children,
  preview = "/resources/locked-preview.svg",
}: LockedPanelProps) {
  const { user } = useAuth();
  const location = useLocation();
  const userId = user?.id ?? null;

  return (
    <div className="locked-panel">
      <img src={preview} alt="" className="locked-panel__preview" aria-hidden="true" />
      <div className="locked-panel__body">
        <h3 className="locked-panel__title">
          <svg viewBox="0 0 12 14" width="14" height="16" aria-hidden="true">
            <rect x="1" y="6" width="10" height="7" rx="1" fill="currentColor" />
            <path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {title}
        </h3>
        {children && <p>{children}</p>}
        <p style={{ marginTop: children ? "var(--space-2)" : 0 }}>
          {user
            ? "Enroll in any CADseekho course to unlock this and every other premium resource."
            : "Already enrolled in a course? Log in to see it. Otherwise, any CADseekho course unlocks it."}
        </p>
        <div className="locked-panel__actions">
          <Link to="/courses" className="btn btn--primary" onClick={() => logResourceEvent(resourceId, "unlock_click", userId)}>
            Unlock with any course
          </Link>
          {!user && (
            <Link to="/login" state={{ from: location }} className="btn btn--outline">
              Log in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
