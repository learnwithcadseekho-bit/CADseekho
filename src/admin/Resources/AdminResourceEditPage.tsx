import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { FileUploadField } from "@/admin/components/FileUploadField";
import { RichTextEditor } from "@/admin/components/RichTextEditor";
import { ResourcesAdminTabs } from "./ResourcesAdminTabs";
import { ResourceRelationsManager } from "./ResourceRelationsManager";
import { RESOURCE_COMPONENTS } from "@/calculators/registry";
import { listAllCourses } from "@/services/admin/adminCourseService";
import {
  getResourceForEdit,
  getResourceUsage,
  listAllSoftware,
  listTopicsWithSoftware,
  type AdminTopic,
  saveResource,
  type ResourceInput,
  type ResourceUsage,
} from "@/services/admin/adminResourceService";
import {
  RESOURCE_ACCESSES,
  RESOURCE_LEVELS,
  RESOURCE_LEVEL_LABELS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type ResourceAccess,
  type ResourceLevel,
  type ResourceStatus,
  type ResourceType,
  type Software,
} from "@/types/resource";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CUSTOM_ENTITLEMENT = "__custom__";

const ACCESS_HELP: Record<ResourceAccess, string> = {
  free: "Everything on the page is public.",
  partial: "The body below is public; the locked content is shown only to students who can unlock it.",
  paid: "Keep the public content to a short intro (or empty) and put the real material in Locked content.",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

interface FormState {
  title: string;
  slug: string;
  summary: string;
  body: string;
  type: ResourceType;
  level: ResourceLevel;
  access: ResourceAccess;
  entitlementChoice: string;
  customEntitlement: string;
  component_key: string;
  componentPropsJson: string;
  thumbnail_url: string;
  file_path: string;
  ctaLabel: string;
  ctaUrl: string;
  status: ResourceStatus;
  softwareIds: string[];
  topicIds: string[];
  premiumHtml: string;
  premiumExtraJson: string;
}

const emptyForm: FormState = {
  title: "",
  slug: "",
  summary: "",
  body: "",
  type: "tutorial",
  level: "beginner",
  access: "free",
  entitlementChoice: "member",
  customEntitlement: "",
  component_key: "",
  componentPropsJson: "{}",
  thumbnail_url: "",
  file_path: "",
  ctaLabel: "",
  ctaUrl: "",
  status: "draft",
  softwareIds: [],
  topicIds: [],
  premiumHtml: "",
  premiumExtraJson: "{}",
};

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text.trim() || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export default function AdminResourceEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [software, setSoftware] = useState<Software[]>([]);
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [courseSlugs, setCourseSlugs] = useState<{ slug: string; title: string }[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [usage, setUsage] = useState<ResourceUsage | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  useEffect(() => {
    listAllSoftware().then(setSoftware).catch(() => {});
    listTopicsWithSoftware().then(setTopics).catch(() => {});
    listAllCourses()
      .then((cs) => setCourseSlugs(cs.map((c) => ({ slug: c.slug, title: c.title }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    getResourceForEdit(id)
      .then((data) => {
        if (!data) {
          setError("Resource not found.");
          return;
        }
        const r = data.resource;
        const { html, ...extra } = data.premium ?? {};
        const ent = r.required_entitlement ?? "member";
        const knownEntitlement = ent === "member" || ent.startsWith("course:");
        setForm({
          title: r.title,
          slug: r.slug,
          summary: r.summary,
          body: r.body,
          type: r.type,
          level: r.level,
          access: r.access,
          entitlementChoice: knownEntitlement ? ent : CUSTOM_ENTITLEMENT,
          customEntitlement: knownEntitlement ? "" : ent,
          component_key: r.component_key ?? "",
          componentPropsJson: JSON.stringify(r.component_props ?? {}, null, 2),
          thumbnail_url: r.thumbnail_url ?? "",
          file_path: r.file_path ?? "",
          ctaLabel: r.course_cta?.label ?? "",
          ctaUrl: r.course_cta?.url ?? "",
          status: r.status,
          softwareIds: data.softwareIds,
          topicIds: data.topicIds,
          premiumHtml: typeof html === "string" ? html : "",
          premiumExtraJson: JSON.stringify(extra, null, 2),
        });
        setSlugTouched(true);
        setPublishedSlug(r.published_at ? r.slug : null);
      })
      .catch(() => setError("Couldn't load this resource."))
      .finally(() => setLoading(false));
    getResourceUsage(id).then(setUsage).catch(() => setUsage(null));
  }, [id, isNew]);

  function validate(): string | null {
    if (!form.title.trim()) return "Title is required.";
    if (!SLUG_PATTERN.test(form.slug)) return "Slug may only contain lowercase letters, numbers and single hyphens (e.g. plate-with-hole-calculator).";
    if (form.access !== "free" && form.entitlementChoice === CUSTOM_ENTITLEMENT && !form.customEntitlement.trim())
      return "Enter the custom entitlement key, or pick another option under “Who can unlock”.";
    if (Boolean(form.ctaLabel.trim()) !== Boolean(form.ctaUrl.trim()))
      return "The course button needs both a label and a link — or leave both empty.";
    if (!parseJsonObject(form.componentPropsJson)) return "Component settings must be a JSON object, e.g. {}.";
    if (form.access !== "free" && !parseJsonObject(form.premiumExtraJson))
      return "Extra locked data must be a JSON object, e.g. {}.";
    if (form.status === "published" && form.softwareIds.length === 0)
      return "Tag at least one software (use “General” for hand calcs) before publishing.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (publishedSlug && form.slug !== publishedSlug) {
      const ok = window.confirm(
        `This resource was already published at /resources/${publishedSlug}. Changing the slug breaks every existing link and search result pointing there. Change it anyway?`
      );
      if (!ok) return;
    }

    setSaving(true);
    setError(null);
    try {
      const entitlement =
        form.access === "free"
          ? null
          : form.entitlementChoice === CUSTOM_ENTITLEMENT
            ? form.customEntitlement.trim()
            : form.entitlementChoice;

      const input: ResourceInput = {
        title: form.title.trim(),
        slug: form.slug,
        summary: form.summary.trim(),
        body: form.body === "<p></p>" ? "" : form.body,
        type: form.type,
        level: form.level,
        access: form.access,
        required_entitlement: entitlement,
        component_key: form.component_key || null,
        component_props: parseJsonObject(form.componentPropsJson)!,
        thumbnail_url: form.thumbnail_url || null,
        file_path: form.file_path || null,
        course_cta: form.ctaLabel.trim() ? { label: form.ctaLabel.trim(), url: form.ctaUrl.trim() } : null,
        status: form.status,
      };

      // Locked content is kept for free resources too (just not shown), so
      // switching access back and forth never loses it.
      const extra = parseJsonObject(form.premiumExtraJson) ?? {};
      const html = form.premiumHtml === "<p></p>" ? "" : form.premiumHtml;
      const premium = html || Object.keys(extra).length > 0 ? { ...extra, ...(html ? { html } : {}) } : null;

      const savedId = await saveResource(isNew ? null : id!, input, form.softwareIds, form.topicIds, premium);
      if (form.status === "published") setPublishedSlug(form.slug);
      setSaved(true);
      if (isNew) navigate(`/admin/resources/${savedId}`, { replace: true });
    } catch (err) {
      const msg = (err as { message?: string; code?: string })?.code === "23505"
        ? "That slug is already used by another resource."
        : "Couldn't save this resource. Please check the fields and try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  const suggestedTopics = topics.filter((t) => t.softwareIds.some((s) => form.softwareIds.includes(s)));
  const otherTopics = topics.filter((t) => !suggestedTopics.includes(t));

  const entitlementOptions = [
    { value: "member", label: "Anyone enrolled in any course (recommended)" },
    ...courseSlugs.map((c) => ({ value: `course:${c.slug}`, label: `Only students of: ${c.title}` })),
    { value: CUSTOM_ENTITLEMENT, label: "Custom key (granted by hand under Access grants)" },
  ];

  const componentOptions = [
    { value: "", label: "None — text content only" },
    ...Object.entries(RESOURCE_COMPONENTS).map(([key, entry]) => ({ value: key, label: `${entry.label} (${key})` })),
    ...(form.component_key && !RESOURCE_COMPONENTS[form.component_key]
      ? [{ value: form.component_key, label: `${form.component_key} (not in this build)` }]
      : []),
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1>{isNew ? "New resource" : "Edit resource"}</h1>
        <div style={{ display: "flex", gap: "var(--space-4)" }}>
          {!isNew && (
            <a href={`/resources/${form.slug}`} target="_blank" rel="noreferrer" className="admin-link">
              {form.status === "published" ? "View live page ↗" : "Preview draft ↗"}
            </a>
          )}
          <Link to="/admin/resources" className="admin-link">
            ← All resources
          </Link>
        </div>
      </div>

      <ResourcesAdminTabs />

      {usage && (
        <div className="admin-stats-inline">
          <span>
            <strong>{usage.views}</strong> <span className="admin-muted">views</span>
          </span>
          <span>
            <strong>{usage.calculations}</strong> <span className="admin-muted">calculations</span>
          </span>
          <span>
            <strong>{usage.unlockClicks}</strong> <span className="admin-muted">unlock clicks</span>
          </span>
          <span className="admin-muted">last 30 days</span>
        </div>
      )}

      {error && <FormMessage type="error">{error}</FormMessage>}
      {saved && !error && <FormMessage type="success">Saved.</FormMessage>}

      <form className="admin-form-card admin-form-card--wide" onSubmit={handleSubmit} noValidate>
        <h2 className="admin-section-title">Basics</h2>
        <TextField
          label="Title"
          required
          value={form.title}
          onChange={(e) => {
            const title = e.target.value;
            setSaved(false);
            setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
          }}
        />
        <TextField
          label="Slug (URL)"
          required
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", e.target.value.toLowerCase());
          }}
        />
        <p className="admin-hint" style={{ marginTop: "calc(-1 * var(--space-2))", marginBottom: "var(--space-4)" }}>
          cadseekho.com/resources/{form.slug || "…"} — keep it permanent once published.
        </p>
        <div className="field">
          <label className="field__label" htmlFor="resource-summary">
            Summary — “What you'll get” (1–2 lines, also used for Google)
          </label>
          <textarea
            id="resource-summary"
            className="field__input"
            rows={2}
            maxLength={300}
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
          />
        </div>
        <div className="admin-form-row">
          <SelectField
            label="Type"
            options={RESOURCE_TYPES.map((t) => ({ value: t, label: RESOURCE_TYPE_LABELS[t] }))}
            value={form.type}
            onChange={(e) => set("type", e.target.value as ResourceType)}
          />
          <SelectField
            label="Level"
            options={RESOURCE_LEVELS.map((l) => ({ value: l, label: RESOURCE_LEVEL_LABELS[l] }))}
            value={form.level}
            onChange={(e) => set("level", e.target.value as ResourceLevel)}
          />
        </div>

        <h2 className="admin-section-title" style={{ marginTop: "var(--space-8)" }}>
          Tags
        </h2>
        <CheckboxGroup
          label="Software"
          options={software.map((s) => ({ value: s.id, label: s.name }))}
          value={form.softwareIds}
          onChange={(v) => set("softwareIds", v)}
        />
        {suggestedTopics.length > 0 && (
          <CheckboxGroup
            label="Topics for the selected software"
            options={suggestedTopics.map((t) => ({ value: t.id, label: t.name }))}
            value={form.topicIds}
            onChange={(v) => set("topicIds", v)}
          />
        )}
        <CheckboxGroup
          label={suggestedTopics.length > 0 ? "Other topics" : "Topics"}
          options={otherTopics.map((t) => ({ value: t.id, label: t.name }))}
          value={form.topicIds}
          onChange={(v) => set("topicIds", v)}
        />

        <h2 className="admin-section-title" style={{ marginTop: "var(--space-8)" }}>
          Content
        </h2>
        <div className="field">
          <label className="field__label">Public content — everyone can read this</label>
          <RichTextEditor value={form.body} onChange={(html) => set("body", html)} imageBucket="resource-thumbnails" />
        </div>
        <SelectField
          label="Interactive component"
          options={componentOptions}
          value={form.component_key}
          onChange={(e) => set("component_key", e.target.value)}
        />
        {form.component_key && (
          <div className="field">
            <label className="field__label" htmlFor="component-props">
              Component settings (JSON, public)
            </label>
            <textarea
              id="component-props"
              className="field__input admin-json"
              value={form.componentPropsJson}
              onChange={(e) => set("componentPropsJson", e.target.value)}
              spellCheck={false}
            />
          </div>
        )}

        <h2 className="admin-section-title" style={{ marginTop: "var(--space-8)" }}>
          Access
        </h2>
        <SelectField
          label="Access"
          options={RESOURCE_ACCESSES.map((a) => ({
            value: a,
            label: { free: "Free — all public", partial: "Partial — part free, part locked", paid: "Paid — locked" }[a],
          }))}
          value={form.access}
          onChange={(e) => set("access", e.target.value as ResourceAccess)}
        />
        <p className="admin-hint" style={{ marginTop: "calc(-1 * var(--space-2))", marginBottom: "var(--space-4)" }}>
          {ACCESS_HELP[form.access]}
        </p>

        {form.access !== "free" && (
          <>
            <SelectField
              label="Who can unlock"
              options={entitlementOptions}
              value={form.entitlementChoice}
              onChange={(e) => set("entitlementChoice", e.target.value)}
            />
            {form.entitlementChoice === CUSTOM_ENTITLEMENT && (
              <TextField
                label="Custom entitlement key"
                placeholder="e.g. pack:scf-calculators"
                value={form.customEntitlement}
                onChange={(e) => set("customEntitlement", e.target.value)}
              />
            )}
            <div className="field">
              <label className="field__label">Locked content</label>
              <RichTextEditor
                value={form.premiumHtml}
                onChange={(html) => set("premiumHtml", html)}
                imageBucket="resource-thumbnails"
              />
              <p className="admin-hint">
                Stored separately from the page and sent only to students who can unlock it. Images inserted here
                are public files, so don't rely on image URLs staying secret.
              </p>
            </div>
            {form.component_key && (
              <div className="field">
                <label className="field__label" htmlFor="premium-json">
                  Extra locked data for the component (JSON)
                </label>
                <textarea
                  id="premium-json"
                  className="field__input admin-json"
                  value={form.premiumExtraJson}
                  onChange={(e) => set("premiumExtraJson", e.target.value)}
                  spellCheck={false}
                />
                <p className="admin-hint">
                  e.g. hand-calc step templates or the validation guide for a calculator. Passed to the component only
                  when unlocked.
                </p>
              </div>
            )}
          </>
        )}

        <h2 className="admin-section-title" style={{ marginTop: "var(--space-8)" }}>
          Media & course link
        </h2>
        <FileUploadField
          label="Thumbnail / social image"
          bucket="resource-thumbnails"
          value={form.thumbnail_url}
          onChange={(url) => set("thumbnail_url", url)}
          returnMode="url"
          accept="image/*"
        />
        {form.thumbnail_url && (
          <button type="button" className="admin-link admin-link--danger" onClick={() => set("thumbnail_url", "")}>
            Remove thumbnail
          </button>
        )}
        <FileUploadField
          label="Downloadable file (private)"
          bucket="resource-files"
          value={form.file_path}
          onChange={(path) => set("file_path", path)}
          returnMode="path"
        />
        {form.file_path && (
          <button type="button" className="admin-link admin-link--danger" onClick={() => set("file_path", "")}>
            Remove file
          </button>
        )}
        <div className="admin-form-row" style={{ marginTop: "var(--space-4)" }}>
          <TextField
            label="Course button label"
            placeholder="e.g. Master this in ANSYS Level 1 →"
            value={form.ctaLabel}
            onChange={(e) => set("ctaLabel", e.target.value)}
          />
          <TextField
            label="Course button link"
            placeholder="/courses/ansys-workbench"
            value={form.ctaUrl}
            onChange={(e) => set("ctaUrl", e.target.value)}
          />
        </div>
        <p className="admin-hint" style={{ marginTop: "calc(-1 * var(--space-2))" }}>
          Leave both empty to link to the course category of the tagged software.
        </p>

        <h2 className="admin-section-title" style={{ marginTop: "var(--space-8)" }}>
          Publishing
        </h2>
        <label className="admin-checkbox-row">
          <input
            type="checkbox"
            checked={form.status === "published"}
            onChange={(e) => set("status", e.target.checked ? "published" : "draft")}
          />
          Published (visible on the site and in search)
        </label>

        <div className="admin-form-actions" style={{ marginTop: "var(--space-6)" }}>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create resource" : "Save changes"}
          </Button>
        </div>
      </form>

      {!isNew && id && <ResourceRelationsManager resourceId={id} />}
    </div>
  );
}
