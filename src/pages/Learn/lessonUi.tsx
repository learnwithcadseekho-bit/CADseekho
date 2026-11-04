import type { OutlineLesson } from "@/services/lessonService";

/** "12 min", "1 h 05 min", or "" for lessons with no duration (quizzes, problems). */
export function formatDuration(lesson: Pick<OutlineLesson, "durationSec" | "durationMinutes">): string {
  const min = lesson.durationSec ? Math.max(1, Math.round(lesson.durationSec / 60)) : lesson.durationMinutes;
  if (!min) return "";
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`;
}

const LABEL: Record<string, string> = {
  done: "Completed",
  locked: "Locked",
  signin: "Free with sign-up",
  soon: "Coming soon",
  processing: "Processing",
  open: "Not started",
};

/** Tick / lock / clock / play — small inline SVGs with a text label for screen readers. */
export function LessonIcon({ lesson }: { lesson: Pick<OutlineLesson, "state" | "completed"> }) {
  const kind = lesson.completed
    ? "done"
    : lesson.state === "coming_soon"
      ? "soon"
      : lesson.state === "locked" || lesson.state === "signin" || lesson.state === "processing"
        ? lesson.state
        : "open";
  return (
    <span className={`learn-icon learn-icon--${kind}`} role="img" aria-label={LABEL[kind]}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        {kind === "done" && <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" />}
        {(kind === "locked" || kind === "signin") && (
          <>
            <rect x="3" y="7" width="10" height="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
        {(kind === "soon" || kind === "processing") && (
          <>
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
        {kind === "open" && <path d="M5 3.5l7 4.5-7 4.5z" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      </svg>
    </span>
  );
}
