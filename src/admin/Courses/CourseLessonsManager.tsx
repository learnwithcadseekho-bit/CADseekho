import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import {
  addCourseFile,
  courseFileExists,
  deleteCourseFile,
  isAnswerFile,
  listLessonModules,
  parseBunnyVideoId,
  setLessonPublished,
  setLessonVideo,
  updateModuleRelease,
  type AdminLesson,
  type AdminLessonModule,
} from "@/services/admin/adminLessonService";

type Message = { type: "success" | "error"; text: string } | null;

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

  async function run(action: () => Promise<void>, success: string) {
    setMessage(null);
    try {
      await action();
      setMessage({ type: "success", text: success });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Couldn't save." });
    }
  }

  return (
    <div className="admin-form-card admin-form-card--wide">
      <h2 style={{ marginBottom: "var(--space-2)" }}>Lessons &amp; videos</h2>
      <p className="admin-hint" style={{ marginBottom: "var(--space-4)" }}>
        Upload the video in Bunny Stream, copy its Video ID (or paste the embed URL), save it here, then tick Published. Free
        modules play for any signed-in user; paid modules for enrolled students. A module that isn't released shows "Coming
        soon" and none of its lessons play.
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

function LessonRow({ lesson, run }: { lesson: AdminLesson; run: (a: () => Promise<void>, s: string) => Promise<void> }) {
  const [input, setInput] = useState(lesson.bunny_video_id ?? "");
  const parsed = input.trim() ? parseBunnyVideoId(input) : null;
  const changed = (parsed ?? "") !== (lesson.bunny_video_id ?? "");

  return (
    <tr>
      <td>
        <strong>{lesson.code}</strong> {lesson.title}
        {lesson.duration_minutes && <span className="admin-hint"> · {lesson.duration_minutes} min</span>}
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
          <Button
            type="button"
            variant="outline"
            disabled={!changed || (input.trim() !== "" && !parsed)}
            onClick={() => run(() => setLessonVideo(lesson.id, parsed), `${lesson.code}: video ${parsed ? "saved" : "removed"}.`)}
          >
            Save
          </Button>
        </div>
        {input.trim() !== "" && !parsed && <p className="field__error">That doesn't contain a Bunny video ID.</p>}
      </td>
      <td>
        <label>
          <input
            type="checkbox"
            checked={lesson.is_published}
            onChange={(e) => {
              if (e.target.checked && !lesson.bunny_video_id && lesson.kind === "video") {
                if (!window.confirm(`${lesson.code} has no video yet. Publish anyway? Learners will see "video coming soon".`)) return;
              }
              run(() => setLessonPublished(lesson.id, e.target.checked), `${lesson.code}: ${e.target.checked ? "published" : "unpublished"}.`);
            }}
          />{" "}
          {lesson.is_published ? "Yes" : "No"}
        </label>
      </td>
    </tr>
  );
}

function ModuleFiles({ module, run }: { module: AdminLessonModule; run: (a: () => Promise<void>, s: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
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
        <Button
          type="button"
          variant="outline"
          disabled={!file || !title.trim() || isAnswerFile(file.name)}
          onClick={() =>
            run(async () => {
              await addCourseFile(module, title.trim(), file!, module.files.length + 1);
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
