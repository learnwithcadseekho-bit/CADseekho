import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import {
  addCourseFile,
  addLesson,
  courseFileExists,
  deleteCourseFile,
  deleteLesson,
  fetchFromBunny,
  isAnswerFile,
  listLessonModules,
  parseBunnyVideoId,
  setCourseFileKind,
  setLessonDescription,
  setLessonPublished,
  setLessonVideo,
  setVideoStatus,
  updateModuleRelease,
  type AdminCourseFile,
  type AdminLesson,
  type AdminLessonModule,
  type EncodeStatus,
} from "@/services/admin/adminLessonService";

type Message = { type: "success" | "error"; text: string } | null;
/** Runs an admin action; the action may return its own success message. */
type Run = (action: () => Promise<void | string>, success: string) => Promise<void>;

const STATUS_LABEL: Record<EncodeStatus, string> = { none: "No video", processing: "Processing", ready: "Ready", failed: "Failed" };
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/**
 * Recorded lessons (e.g. SOLIDWORKS Simulation): per module — free / released
 * flags and downloads; per lesson — paste the Bunny video id, then publish.
 * Only shown for courses that have lessons or coded modules.
 */
export function CourseLessonsManager({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<AdminLessonModule[] | null>(null);
  const [message, setMessage] = useState<Message>(null);

  function load() {
    listLessonModules(courseId)
      .then(setModules)
      .catch(() => setModules([]));
  }
  useEffect(load, [courseId]);

  if (modules === null) return null;
  if (!modules.some((m) => m.code || m.lessons.length > 0)) return null;

  const run: Run = async (action, success) => {
    setMessage(null);
    try {
      const text = await action();
      setMessage({ type: "success", text: text || success });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Couldn't save." });
    }
  };

  return (
    <div className="admin-form-card admin-form-card--wide">
      <h2 style={{ marginBottom: "var(--space-2)" }}>Lessons &amp; videos</h2>
      <p className="admin-hint" style={{ marginBottom: "var(--space-4)" }}>
        Upload the video in Bunny Stream, copy its Video ID (or paste the embed URL) and save it here — the status and length
        are fetched from Bunny automatically (and kept up to date by the Bunny webhook). Once it says Ready, tick Published:
        learners see it straight away. Free modules play for any signed-in user; paid modules for students with active access.
        A module that isn't released shows "Coming soon" and none of its lessons play.
      </p>
      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {modules.map((m) => (
        <fieldset className="admin-fieldset" key={m.id} style={{ marginBottom: "var(--space-6)" }}>
          <legend>
            <strong>{m.code ?? `#${m.order_number}`}</strong> · {m.title}
          </legend>
          <div className="admin-checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={m.is_free}
                onChange={(e) => run(() => updateModuleRelease(m.id, { is_free: e.target.checked }), `${m.code ?? m.title}: saved.`)}
              />{" "}
              Free (any signed-in user)
            </label>
            <label>
              <input
                type="checkbox"
                checked={m.is_released}
                onChange={(e) => run(() => updateModuleRelease(m.id, { is_released: e.target.checked }), `${m.code ?? m.title}: saved.`)}
              />{" "}
              Released
            </label>
          </div>
          {!m.is_released && (
            <ReleaseLabel
              value={m.release_label ?? ""}
              onSave={(v) => run(() => updateModuleRelease(m.id, { release_label: v || null }), `${m.code ?? m.title}: saved.`)}
            />
          )}

          {m.lessons.length > 0 && (
            <table className="admin-table" style={{ marginTop: "var(--space-4)" }}>
              <thead>
                <tr>
                  <th>Lesson</th>
                  <th>Bunny video ID</th>
                  <th>Status</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {m.lessons.map((l) => (
                  <LessonRow key={l.id} lesson={l} run={run} />
                ))}
              </tbody>
            </table>
          )}

          <AddLesson module={m} run={run} />
          <ModuleFiles module={m} run={run} />
        </fieldset>
      ))}
    </div>
  );
}

function ReleaseLabel({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <div className="admin-form-row" style={{ alignItems: "end" }}>
      <TextField label='"Coming soon" note (optional)' placeholder="e.g. Week of 24 Nov" value={text} onChange={(e) => setText(e.target.value)} />
      <Button type="button" variant="outline" onClick={() => onSave(text.trim())} disabled={text.trim() === value}>
        Save note
      </Button>
    </div>
  );
}

function LessonRow({ lesson, run }: { lesson: AdminLesson; run: Run }) {
  const [input, setInput] = useState(lesson.bunny_video_id ?? "");
  const [description, setDescription] = useState(lesson.description ?? "");
  const parsed = input.trim() ? parseBunnyVideoId(input) : null;
  const changed = (parsed ?? "") !== (lesson.bunny_video_id ?? "");
  const status = lesson.encode_status;

  async function saveVideo() {
    await setLessonVideo(lesson.id, parsed);
    if (!parsed) return `${lesson.code}: video removed.`;
    try {
      const info = await fetchFromBunny(lesson.id);
      return `${lesson.code}: video saved — Bunny says ${STATUS_LABEL[info.encode_status]}${info.duration_sec ? `, ${mmss(info.duration_sec)}` : ""}.`;
    } catch (err) {
      return `${lesson.code}: video saved, but couldn't fetch its status (${err instanceof Error ? err.message : "error"}). Set the status by hand if needed.`;
    }
  }

  return (
    <tr>
      <td>
        <strong>{lesson.code}</strong> {lesson.title}
        {lesson.duration_minutes && <span className="admin-hint"> · {lesson.duration_minutes} min</span>}
        <details style={{ marginTop: "var(--space-2)" }}>
          <summary className="admin-hint">Description {lesson.description ? "✓" : "(optional)"}</summary>
          <textarea
            className="field__input"
            aria-label={`Description for ${lesson.code}`}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", marginTop: "var(--space-2)" }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={description.trim() === (lesson.description ?? "")}
            onClick={() => run(() => setLessonDescription(lesson.id, description), `${lesson.code}: description saved.`)}
          >
            Save description
          </Button>
        </details>
      </td>
      <td>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <input
            className="field__input"
            aria-label={`Bunny video ID for ${lesson.code}`}
            placeholder="Video ID or embed URL"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <Button type="button" variant="outline" disabled={!changed || (input.trim() !== "" && !parsed)} onClick={() => run(saveVideo, "")}>
            Save
          </Button>
        </div>
        {input.trim() !== "" && !parsed && <p className="field__error">That doesn't contain a Bunny video ID.</p>}
      </td>
      <td>
        {lesson.bunny_video_id ? (
          <div style={{ display: "grid", gap: "var(--space-2)", justifyItems: "start" }}>
            <span className="admin-badge">
              {STATUS_LABEL[status ?? "none"]}
              {lesson.duration_sec ? ` · ${mmss(lesson.duration_sec)}` : ""}
            </span>
            <button
              type="button"
              className="admin-link"
              onClick={() =>
                run(async () => {
                  const info = await fetchFromBunny(lesson.id);
                  return `${lesson.code}: ${STATUS_LABEL[info.encode_status]}${info.duration_sec ? `, ${mmss(info.duration_sec)}` : ""} (Bunny status ${info.bunny_status}).`;
                }, "")
              }
            >
              Fetch from Bunny
            </button>
            <select
              className="field__input"
              aria-label={`Set status for ${lesson.code} by hand`}
              value={status ?? "none"}
              onChange={(e) => run(() => setVideoStatus(lesson.id, e.target.value as EncodeStatus), `${lesson.code}: status set.`)}
            >
              {(Object.keys(STATUS_LABEL) as EncodeStatus[]).map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="admin-hint">{lesson.kind === "video" ? "—" : "No video needed"}</span>
        )}
      </td>
      <td>
        <label>
          <input
            type="checkbox"
            checked={lesson.is_published}
            onChange={(e) => {
              if (e.target.checked && lesson.kind === "video" && status !== "ready") {
                const why = lesson.bunny_video_id ? "its video isn't Ready yet" : "it has no video yet";
                if (!window.confirm(`${lesson.code}: ${why}. Publish anyway? Learners will see "being prepared" until it is.`)) return;
              }
              run(() => setLessonPublished(lesson.id, e.target.checked), `${lesson.code}: ${e.target.checked ? "published" : "unpublished"}.`);
            }}
          />{" "}
          {lesson.is_published ? "Yes" : "No"}
        </label>
        {!lesson.is_published && (
          <button
            type="button"
            className="admin-link admin-link--danger"
            style={{ display: "block", marginTop: "var(--space-2)" }}
            onClick={() => {
              if (!window.confirm(`Delete ${lesson.code} ${lesson.title}? Its video ID and learners' progress on it are deleted too.`)) return;
              run(() => deleteLesson(lesson.id), `${lesson.code} deleted.`);
            }}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

function AddLesson({ module, run }: { module: AdminLessonModule; run: Run }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"video" | "quiz" | "problems" | "test">("video");
  const [minutes, setMinutes] = useState("");
  return (
    <details style={{ marginTop: "var(--space-4)" }}>
      <summary className="admin-section-title" style={{ cursor: "pointer" }}>
        Add a lesson
      </summary>
      <div className="admin-form-row" style={{ alignItems: "end" }}>
        <TextField label="Code" placeholder="e.g. M2.1" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} />
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="field">
          <label className="field__label" htmlFor={`newkind-${module.id}`}>
            Type
          </label>
          <select id={`newkind-${module.id}`} className="field__input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="video">Video</option>
            <option value="quiz">Quiz</option>
            <option value="problems">Problems</option>
            <option value="test">Test</option>
          </select>
        </div>
        <TextField label="Minutes (optional)" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} />
        <Button
          type="button"
          variant="outline"
          disabled={!code.trim() || !title.trim()}
          onClick={() =>
            run(async () => {
              await addLesson(module, { code, title, kind, duration_minutes: minutes ? Number(minutes) : null });
              setCode("");
              setTitle("");
              setMinutes("");
            }, `${code.trim()} added (unpublished).`)
          }
        >
          Add
        </Button>
      </div>
      <p className="admin-hint">Lessons are added at the end of the module, unpublished. Paste the video ID, then publish.</p>
    </details>
  );
}

function ModuleFiles({ module, run }: { module: AdminLessonModule; run: Run }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<AdminCourseFile["kind"]>("resource");
  const [present, setPresent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(module.files.map(async (f) => [f.storage_path, await courseFileExists(f.storage_path)] as const)).then((pairs) => {
      if (!cancelled) setPresent(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [module.files]);

  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <h3 className="admin-section-title">Downloads</h3>
      {module.files.length > 0 && (
        <ul className="admin-ordered-list">
          {module.files.map((f) => (
            <li key={f.id}>
              {f.title} <code className="admin-hint">{f.storage_path}</code>{" "}
              {present[f.storage_path] === false && <span className="admin-badge">Not uploaded yet</span>}{" "}
              <select
                aria-label={`Tab for ${f.title}`}
                value={f.kind}
                onChange={(e) => run(() => setCourseFileKind(f.id, e.target.value as AdminCourseFile["kind"]), "File moved.")}
              >
                <option value="resource">Resources tab</option>
                <option value="problems">Problems tab</option>
              </select>{" "}
              <button type="button" className="admin-link admin-link--danger" onClick={() => run(() => deleteCourseFile(f), "File removed.")}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="admin-form-row" style={{ alignItems: "end" }}>
        <TextField label="File title" placeholder="e.g. SOLIDWORKS part files (start)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="field">
          <label className="field__label" htmlFor={`file-${module.id}`}>
            File (same name as a seeded row replaces it)
          </label>
          <input id={`file-${module.id}`} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file && isAnswerFile(file.name) && <p className="field__error">Test/answer files can't be uploaded.</p>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`kind-${module.id}`}>
            Show under
          </label>
          <select id={`kind-${module.id}`} className="field__input" value={kind} onChange={(e) => setKind(e.target.value as AdminCourseFile["kind"])}>
            <option value="resource">Resources</option>
            <option value="problems">Problems</option>
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!file || !title.trim() || isAnswerFile(file.name)}
          onClick={() =>
            run(async () => {
              await addCourseFile(module, title.trim(), file!, module.files.length + 1, kind);
              setTitle("");
              setFile(null);
            }, "File uploaded.")
          }
        >
          Upload
        </Button>
      </div>
    </div>
  );
}
