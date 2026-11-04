import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";
import { useCachedData } from "@/hooks/useCachedData";
import {
  canAccessModule,
  getCourseFileUrl,
  getCourseOutline,
  getCourseSyllabus,
  getLessonPlayUrl,
  learnPath,
  saveLessonProgress,
  type CourseOutline,
  type OutlineLesson,
  type OutlineModule,
  type PlayRefusal,
  type PlayUrl,
} from "@/services/lessonService";
import { LEARN_CONFIG, courseOffer } from "@/content/learn";
import { SIGNUP_INTENT, SIGNUP_INTENT_KEY, moduleLabel } from "@/content/swSimulation";
import { useBunnyPlayer } from "./bunnyPlayer";
import { LessonIcon, formatDuration } from "./lessonUi";
import "./learn.css";

type PlayState = { kind: "idle" } | { kind: "loading" } | { kind: "ready"; play: PlayUrl } | { kind: "refused"; code: PlayRefusal; message: string };
type Tab = "overview" | "resources" | "problems";

/**
 * /learn/:courseSlug/:lessonCode — the recorded-course player. Open to
 * signed-out visitors (they see the syllabus and a sign-up prompt). Every
 * lock, tick and "coming soon" comes from public.course_outline; the video
 * only ever arrives as a short-lived signed URL from lesson-play-url.
 */
export default function LearnPage() {
  const { courseSlug = "", lessonCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user, loading: authLoading } = useAuth();
  const signedIn = Boolean(session);

  const [outline, setOutline] = useState<CourseOutline | null | undefined>(undefined);
  const [outlineError, setOutlineError] = useState(false);

  // Reload the outline when who's watching changes (sign in/out).
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setOutlineError(false);
    getCourseOutline(courseSlug)
      .then((o) => !cancelled && setOutline(o))
      .catch(() => !cancelled && setOutlineError(true));
    return () => {
      cancelled = true;
    };
  }, [courseSlug, authLoading, user?.id]);

  const flat = useMemo(() => outline?.modules.flatMap((m) => m.lessons.map((l) => ({ module: m, lesson: l }))) ?? [], [outline]);
  const index = flat.findIndex((x) => x.lesson.code === lessonCode);
  const current = index >= 0 ? flat[index] : null;

  /** Patch one lesson in the outline after saving progress (no refetch). */
  const patchLesson = useCallback((id: string, patch: Partial<OutlineLesson>) => {
    setOutline((o) =>
      o ? { ...o, modules: o.modules.map((m) => ({ ...m, lessons: m.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) })) } : o
    );
  }, []);

  if (outlineError) {
    return (
      <section className="section container">
        <Seo title="Course" noindex />
        <p>Couldn't load this course. Please refresh the page.</p>
      </section>
    );
  }
  if (authLoading || outline === undefined) {
    return (
      <section className="section container">
        <Seo title="Loading…" noindex />
        <p className="section__status">Loading…</p>
      </section>
    );
  }
  if (outline === null) {
    return (
      <section className="section container">
        <Seo title="Course not found" noindex />
        <h1>Course not found</h1>
        <p>
          <Link to="/courses">Browse courses →</Link>
        </p>
      </section>
    );
  }

  // /learn/<course> or an unknown code → the first lesson the user can open (or the first lesson).
  if (!current) {
    const target = flat.find((x) => x.lesson.state === "open") ?? flat.find((x) => x.lesson.state !== "coming_soon") ?? flat[0];
    if (target && target.lesson.code !== lessonCode) return <Navigate to={learnPath(courseSlug, target.lesson.code)} replace />;
    return (
      <section className="section container">
        <Seo title={outline.courseTitle} noindex />
        <h1>{outline.courseTitle}</h1>
        <p>Lessons are coming soon.</p>
      </section>
    );
  }

  return (
    <LessonView
      key={current.lesson.id}
      courseSlug={courseSlug}
      outline={outline}
      module={current.module}
      lesson={current.lesson}
      prev={index > 0 ? flat[index - 1].lesson : null}
      next={index < flat.length - 1 ? flat[index + 1].lesson : null}
      firstOpen={flat.find((x) => x.lesson.state === "open")?.lesson ?? null}
      signedIn={signedIn}
      email={user?.email ?? null}
      onPatch={patchLesson}
      onNavigate={(code) => navigate(learnPath(courseSlug, code))}
      from={location}
    />
  );
}

interface LessonViewProps {
  courseSlug: string;
  outline: CourseOutline;
  module: OutlineModule;
  lesson: OutlineLesson;
  prev: OutlineLesson | null;
  next: OutlineLesson | null;
  firstOpen: OutlineLesson | null;
  signedIn: boolean;
  email: string | null;
  onPatch: (id: string, patch: Partial<OutlineLesson>) => void;
  onNavigate: (code: string) => void;
  from: ReturnType<typeof useLocation>;
}

function LessonView({ courseSlug, outline, module, lesson, prev, next, firstOpen, signedIn, email, onPatch, onNavigate, from }: LessonViewProps) {
  const offer = courseOffer(courseSlug, outline.courseTitle);
  const [play, setPlay] = useState<PlayState>({ kind: "idle" });
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lockedDialog = useRef<HTMLDialogElement>(null);
  const isVideo = lesson.kind === "video";

  // Signed URL, only for lessons the server already says are open.
  useEffect(() => {
    if (lesson.state !== "open" || !isVideo) return;
    let cancelled = false;
    setPlay({ kind: "loading" });
    getLessonPlayUrl(lesson.id).then((r) => {
      if (!cancelled) setPlay(r.ok ? { kind: "ready", play: r.play } : { kind: "refused", code: r.code, message: r.message });
    });
    return () => {
      cancelled = true;
    };
  }, [lesson.id, lesson.state, isVideo]);

  // Opening a locked lesson shows the unlock prompt.
  useEffect(() => {
    if (lesson.state === "locked" && signedIn) lockedDialog.current?.showModal?.();
  }, [lesson.state, signedIn]);

  const save = useCallback(
    (seconds: number, duration: number | null, completed?: boolean) => {
      saveLessonProgress(lesson.id, seconds, { durationSec: duration, completed })
        .then((r) => {
          setSaveError(null);
          onPatch(lesson.id, { positionSec: r.positionSec, completed: r.completed });
        })
        .catch(() => setSaveError("Couldn't save your progress. Check your connection."));
    },
    [lesson.id, onPatch]
  );

  useBunnyPlayer(play.kind === "ready" ? iframe : null, play.kind === "ready" ? play.play.resumeAt : 0, {
    onSave: (s, d) => save(s, d),
    onEnded: (d) => save(d ?? 0, d, true),
  });

  function rememberSignupIntent() {
    try {
      sessionStorage.setItem(SIGNUP_INTENT_KEY, SIGNUP_INTENT);
    } catch {
      // storage blocked
    }
  }

  const unlock = (
    <Link to={offer.path} className="btn btn--primary">
      {offer.price ? `Unlock ${offer.name}` : "See pricing"}
    </Link>
  );

  // What covers the video frame. null = the player.
  let gate: JSX.Element | null = null;
  if (lesson.state === "signin") {
    gate = (
      <>
        <p>This lesson is free. Create a free account to watch it and download the part files.</p>
        <Link to="/signup" state={{ from }} className="btn btn--primary" onClick={rememberSignupIntent}>
          Sign up free to watch
        </Link>
        <p>
          Already have an account? <Link to="/login" state={{ from }}>Sign in</Link>
        </p>
      </>
    );
  } else if (lesson.state === "locked") {
    gate = signedIn ? (
      <>
        <p>
          This lesson is part of {offer.name}.{offer.price ? ` ${offer.price}.` : ""}
        </p>
        {unlock}
        {firstOpen && (
          <button type="button" className="learn-linkbtn" onClick={() => onNavigate(firstOpen.code)}>
            Back to free lessons
          </button>
        )}
      </>
    ) : (
      <>
        <p>This lesson is part of {offer.name}. Sign in if you've already enrolled.</p>
        <Link to="/login" state={{ from }} className="btn btn--primary">
          Sign in
        </Link>
        <Link to={offer.path}>See pricing</Link>
      </>
    );
  } else if (lesson.state === "coming_soon") {
    gate = <p>This lesson is coming soon{module.releaseLabel ? ` — ${module.releaseLabel}` : ""}.</p>;
  } else if (lesson.state === "processing") {
    gate = <p>This video is being prepared. Please check back shortly.</p>;
  } else if (!isVideo) {
    gate = (
      <>
        <p>
          {lesson.kind === "problems"
            ? "Work through this module's problems — the PDF is under Problems below."
            : lesson.kind === "quiz"
              ? "Quiz for this module. Check your answers, then mark it complete."
              : "Module test."}
        </p>
        <button type="button" className="btn btn--outline" onClick={() => setTab("problems")}>
          Open Problems
        </button>
      </>
    );
  } else if (play.kind === "idle" || play.kind === "loading") {
    gate = <p>Loading video…</p>;
  } else if (play.kind === "refused") {
    gate = <p>{play.message}</p>;
  }

  const canMark = lesson.state === "open" && signedIn;

  return (
    <div className="container learn">
      <Seo title={`${lesson.code} ${lesson.title}`} noindex />

      <button type="button" className="learn__navtoggle btn btn--outline" aria-expanded={navOpen} aria-controls="learn-nav" onClick={() => setNavOpen((v) => !v)}>
        {navOpen ? "Hide course content" : "Course content"}
      </button>

      <CourseNav
        id="learn-nav"
        open={navOpen}
        courseSlug={courseSlug}
        outline={outline}
        currentId={lesson.id}
        currentModuleId={module.id}
        onPick={() => setNavOpen(false)}
      />

      <main className="learn__main">
        <p className="mono-label">
          <Link to={offer.path}>{outline.courseTitle}</Link>
          {module.code && ` · ${moduleLabel(module.code)}`}: {module.title}
        </p>
        <h1 className="learn__title">{isVideo ? `${lesson.code} · ${lesson.title}` : lesson.title}</h1>

        <div className="learn__frame">
          {gate === null && play.kind === "ready" ? (
            <>
              <iframe
                ref={setIframe}
                src={play.play.url}
                title={`${lesson.code} ${lesson.title}`}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              {LEARN_CONFIG.watermarkOverlay && email && <Watermark text={email} />}
            </>
          ) : (
            <div className="learn__gate">{gate}</div>
          )}
        </div>

        <div className="learn__bar">
          <div className="learn__steps">
            <button type="button" className="btn btn--outline btn--sm" disabled={!prev} onClick={() => prev && onNavigate(prev.code)}>
              ← Previous
            </button>
            <button type="button" className="btn btn--outline btn--sm" disabled={!next} onClick={() => next && onNavigate(next.code)}>
              Next →
            </button>
          </div>
          {canMark && (
            <button
              type="button"
              className={`btn btn--sm ${lesson.completed ? "btn--outline" : "btn--primary"}`}
              aria-pressed={lesson.completed}
              onClick={() => save(lesson.positionSec, lesson.durationSec, !lesson.completed)}
            >
              {lesson.completed ? "✓ Completed · Undo" : "Mark as complete"}
            </button>
          )}
        </div>
        {saveError && <p className="field__error">{saveError}</p>}

        <LessonTabs tab={tab} onTab={setTab} lesson={lesson} module={module} courseSlug={courseSlug} signedIn={signedIn} />
      </main>

      <dialog ref={lockedDialog} className="learn-dialog" aria-labelledby="learn-dialog-title">
        <h2 id="learn-dialog-title">Unlock this lesson</h2>
        <p>
          {lesson.code} {lesson.title} is part of {offer.name}.{offer.price ? ` Unlock it for ${offer.price}.` : ""}
        </p>
        <div className="learn-dialog__actions">
          {unlock}
          {firstOpen ? (
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                lockedDialog.current?.close();
                onNavigate(firstOpen.code);
              }}
            >
              Back to free lessons
            </button>
          ) : (
            <button type="button" className="btn btn--outline" onClick={() => lockedDialog.current?.close()}>
              Close
            </button>
          )}
        </div>
      </dialog>
    </div>
  );
}

function CourseNav({
  id,
  open,
  courseSlug,
  outline,
  currentId,
  currentModuleId,
  onPick,
}: {
  id: string;
  open: boolean;
  courseSlug: string;
  outline: CourseOutline;
  currentId: string;
  currentModuleId: string;
  onPick: () => void;
}) {
  return (
    <nav id={id} className={`learn__nav ${open ? "learn__nav--open" : ""}`} aria-label="Course content">
      {outline.modules.map((m) => {
        const done = m.lessons.filter((l) => l.completed).length;
        return (
          <details key={m.id} className="learn-module" open={m.id === currentModuleId}>
            <summary>
              <span className="learn-module__code">{m.code ? moduleLabel(m.code) : "Module"}</span>
              <span className="learn-module__title">{m.title}</span>
              <span className="learn-module__meta">
                {!m.released
                  ? `Coming soon${m.releaseLabel ? ` · ${m.releaseLabel}` : ""}`
                  : m.lessons.length > 0
                    ? `${done}/${m.lessons.length}${m.isFree ? " · Free" : ""}`
                    : "Coming soon"}
              </span>
            </summary>
            {m.lessons.length > 0 && (
              <ol>
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    {l.state === "coming_soon" ? (
                      <span className="learn-lesson learn-lesson--soon">
                        <LessonIcon lesson={l} />
                        <span className="learn-lesson__title">{l.kind === "video" ? `${l.code} ${l.title}` : l.title}</span>
                        <span className="learn-lesson__dur">Soon</span>
                      </span>
                    ) : (
                      <Link
                        to={learnPath(courseSlug, l.code)}
                        className={`learn-lesson learn-lesson--${l.state}`}
                        aria-current={l.id === currentId ? "page" : undefined}
                        onClick={onPick}
                      >
                        <LessonIcon lesson={l} />
                        <span className="learn-lesson__title">{l.kind === "video" ? `${l.code} ${l.title}` : l.title}</span>
                        <span className="learn-lesson__dur">{formatDuration(l)}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </details>
        );
      })}
    </nav>
  );
}

function LessonTabs({
  tab,
  onTab,
  lesson,
  module,
  courseSlug,
  signedIn,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  lesson: OutlineLesson;
  module: OutlineModule;
  courseSlug: string;
  signedIn: boolean;
}) {
  // File list is public (titles only); downloading goes through storage RLS (same access rule).
  const { data: syllabus } = useCachedData(`lessons:syllabus:${courseSlug}`, () => getCourseSyllabus(courseSlug));
  const files = syllabus?.find((m) => m.id === module.id)?.course_files ?? [];
  const resources = files.filter((f) => f.kind !== "problems");
  const problems = files.filter((f) => f.kind === "problems");
  const [filesOpen, setFilesOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return setFilesOpen(false);
    canAccessModule(module.id)
      .then(setFilesOpen)
      .catch(() => setFilesOpen(false));
  }, [module.id, signedIn]);

  async function download(path: string) {
    setFileError(null);
    try {
      window.location.assign(await getCourseFileUrl(path));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Couldn't download that file.");
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "resources", label: `Resources${resources.length ? ` (${resources.length})` : ""}` },
    { key: "problems", label: `Problems${problems.length ? ` (${problems.length})` : ""}` },
  ];

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const nextTab = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].key;
    onTab(nextTab);
    document.getElementById(`learn-tab-${nextTab}`)?.focus();
  }

  const fileList = (list: typeof files, empty: string) =>
    list.length === 0 ? (
      <p className="learn__empty">{empty}</p>
    ) : (
      <ul className="learn-files">
        {list.map((f) => (
          <li key={f.id}>
            <span>{f.title}</span>
            {filesOpen ? (
              <button type="button" className="btn btn--outline btn--sm" onClick={() => download(f.storage_path)}>
                Download
              </button>
            ) : (
              <span className="learn-files__locked">{signedIn ? "Enrolled learners" : "Sign up free"}</span>
            )}
          </li>
        ))}
      </ul>
    );

  return (
    <section className="learn-tabs">
      <div role="tablist" aria-label="Lesson details" className="learn-tabs__list">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            id={`learn-tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`learn-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            className="learn-tabs__tab"
            onClick={() => onTab(t.key)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`learn-panel-${tab}`} role="tabpanel" aria-labelledby={`learn-tab-${tab}`} className="learn-tabs__panel" tabIndex={0}>
        {fileError && <p className="field__error">{fileError}</p>}
        {tab === "overview" &&
          (lesson.description ? (
            lesson.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
          ) : (
            <p className="learn__empty">
              {module.code ? moduleLabel(module.code) : "Module"}: {module.title}
              {lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ""}
            </p>
          ))}
        {tab === "resources" && fileList(resources, "No downloads for this module yet.")}
        {tab === "problems" && fileList(problems, "No problem set for this module yet.")}
      </div>
    </section>
  );
}

/** Faint email that jumps to a new spot every ~30 s. pointer-events: none, so it never blocks the player. */
function Watermark({ text }: { text: string }) {
  const [pos, setPos] = useState({ top: 12, left: 8 });
  useEffect(() => {
    const id = window.setInterval(() => {
      setPos({ top: 8 + Math.random() * 72, left: 4 + Math.random() * 60 });
    }, LEARN_CONFIG.watermarkMoveSeconds * 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="learn__watermark" aria-hidden="true" style={{ top: `${pos.top}%`, left: `${pos.left}%` }}>
      {text}
    </span>
  );
}
