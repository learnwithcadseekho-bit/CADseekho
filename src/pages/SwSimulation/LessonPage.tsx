import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";
import { useCachedData } from "@/hooks/useCachedData";
import {
  canAccessModule,
  getCourseFileUrl,
  getCourseSyllabus,
  getLessonPlayUrl,
  type PlayRefusal,
  type PlayUrl,
} from "@/services/lessonService";
import { SIGNUP_INTENT, SIGNUP_INTENT_KEY, SW_SIM, SW_SIM_CONFIG, findLesson, moduleLabel } from "@/content/swSimulation";
import "../Launch/launch.css";
import "./sw-simulation.css";

type PlayState = { kind: "idle" } | { kind: "loading" } | { kind: "ready"; play: PlayUrl } | { kind: "refused"; code: PlayRefusal; message: string };

/**
 * /classroom/solidworks-simulation/:code — one lesson. Open to everyone so a
 * signed-out visitor sees what the lesson is and a "Sign up free" prompt; the
 * video itself only arrives as a signed URL from lesson-play-url.
 */
export default function LessonPage() {
  const { code = "" } = useParams();
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();
  const signedIn = Boolean(session);
  const content = findLesson(code);
  const courseSlug = SW_SIM_CONFIG.courseSlugs.level1;
  const { data: syllabus, error: syllabusError } = useCachedData(`lessons:syllabus:${courseSlug}`, () => getCourseSyllabus(courseSlug));

  const liveModule = syllabus?.find((m) => m.code === content?.module.code);
  const liveLesson = liveModule?.course_lessons.find((l) => l.code === code);
  const free = liveModule?.is_free ?? content?.module.free ?? false;

  const [play, setPlay] = useState<PlayState>({ kind: "idle" });
  const [filesOpen, setFilesOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Ask for the signed URL once we know who's watching and which lesson row it is.
  useEffect(() => {
    if (authLoading || !signedIn || !liveLesson) return;
    let cancelled = false;
    setPlay({ kind: "loading" });
    getLessonPlayUrl(liveLesson.id).then((r) => {
      if (cancelled) return;
      setPlay(r.ok ? { kind: "ready", play: r.play } : { kind: "refused", code: r.code, message: r.message });
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, signedIn, liveLesson]);

  useEffect(() => {
    if (!liveModule || !signedIn) {
      setFilesOpen(false);
      return;
    }
    canAccessModule(liveModule.id)
      .then(setFilesOpen)
      .catch(() => setFilesOpen(false));
  }, [liveModule, signedIn]);

  async function download(path: string) {
    setFileError(null);
    try {
      window.location.assign(await getCourseFileUrl(path));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Couldn't download that file.");
    }
  }

  function rememberSignupIntent() {
    try {
      sessionStorage.setItem(SIGNUP_INTENT_KEY, SIGNUP_INTENT);
    } catch {
      // storage blocked
    }
  }

  if (!content) {
    return (
      <section className="section container">
        <Seo title="Lesson not found" noindex />
        <h1>Lesson not found</h1>
        <p>
          <Link to={SW_SIM.path}>Back to the SOLIDWORKS Simulation course →</Link>
        </p>
      </section>
    );
  }

  const { module, lesson } = content;
  const lessons = liveModule?.course_lessons ?? [];
  const files = liveModule?.course_files ?? [];

  // What covers the video frame, in order. null = show the player.
  let gate: JSX.Element | null;
  if (authLoading) {
    gate = <p>Loading…</p>;
  } else if (!signedIn) {
    gate = free ? (
      <>
        <p>Module 0 and Module 1 are free. Create a free account to watch this lesson and download the part files.</p>
        <Link to="/signup" state={{ from: location }} className="btn btn--primary" onClick={rememberSignupIntent}>
          Sign up free to watch
        </Link>
        <p>
          Already have an account? <Link to="/login" state={{ from: location }}>Sign in</Link>
        </p>
      </>
    ) : (
      <>
        <p>This lesson is part of the paid course.</p>
        <Link to={`${SW_SIM.path}#pricing`} className="btn btn--primary">
          See pricing
        </Link>
      </>
    );
  } else if (syllabusError) {
    gate = <p>Couldn't load this lesson. Please refresh the page.</p>;
  } else if (syllabus === undefined) {
    gate = <p>Loading…</p>;
  } else if (!liveLesson) {
    gate = <p>This lesson is coming soon.</p>;
  } else if (play.kind === "idle" || play.kind === "loading") {
    gate = <p>Loading video…</p>;
  } else if (play.kind === "refused") {
    gate =
      play.code === "locked" ? (
        <>
          <p>{play.message}</p>
          <Link to={`${SW_SIM.path}#pricing`} className="btn btn--primary">
            See pricing
          </Link>
        </>
      ) : (
        <p>{play.message}</p>
      );
  } else {
    gate = null;
  }

  return (
    <div className="container sws-player">
      <Seo title={`${lesson.code} ${lesson.title}`} noindex />
      <div>
        <p className="mono-label">
          <Link to={SW_SIM.path}>SOLIDWORKS Simulation</Link> · {moduleLabel(module.code)}: {module.title}
        </p>
        <h1 className="sws-player__title">
          {lesson.kind === "video" ? `${lesson.code} · ${lesson.title}` : lesson.title}
        </h1>

        <div className="sws-player__frame">
          {gate === null && play.kind === "ready" ? (
            <iframe
              src={play.play.url}
              title={`${lesson.code} ${lesson.title}`}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="sws-player__gate">{gate}</div>
          )}
        </div>

        {files.length > 0 && (
          <section className="sws-player__files" aria-labelledby="sws-files">
            <h2 id="sws-files">Downloads for {moduleLabel(module.code)}</h2>
            {fileError && <p className="field__error">{fileError}</p>}
            <ul>
              {files.map((f) => (
                <li key={f.id} className="sws-player__file">
                  <span>{f.title}</span>
                  {filesOpen ? (
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => download(f.storage_path)}>
                      Download
                    </button>
                  ) : (
                    <span className="sws-lesson__state">{signedIn ? "Enrolled learners" : "Sign up free"}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <nav className="sws-player__nav" aria-label={`${moduleLabel(module.code)} lessons`}>
        <h2>
          {moduleLabel(module.code)}: {module.title}
        </h2>
        <ol>
          {module.lessons.map((l) => {
            const row = lessons.find((x) => x.code === l.code);
            const label = l.kind === "video" ? `${l.code} ${l.title}` : l.title;
            return (
              <li key={l.code}>
                {row?.is_published || l.code === code ? (
                  <Link to={`${SW_SIM.classroomPath}/${encodeURIComponent(l.code)}`} aria-current={l.code === code ? "page" : undefined}>
                    {label}
                  </Link>
                ) : (
                  <span>{label} · coming soon</span>
                )}
              </li>
            );
          })}
        </ol>
        <Link to={`${SW_SIM.path}#syllabus`}>Full syllabus →</Link>
      </nav>
    </div>
  );
}
