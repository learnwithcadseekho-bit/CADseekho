import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { FontSize } from "./fontSizeExtension";
import { supabase } from "@/lib/supabaseClient";
import "./rich-text-editor.css";

const FONT_SIZES = [
  { label: "Small", value: "14px" },
  { label: "Normal", value: "" },
  { label: "Large", value: "20px" },
  { label: "X-Large", value: "24px" },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Enables the "Insert Image" toolbar button, uploading to this public bucket. */
  imageBucket?: string;
}

export function RichTextEditor({ value, onChange, placeholder, imageBucket }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, FontSize, ...(imageBucket ? [Image] : [])],
    content: value,
    editorProps: {
      attributes: {
        class: "rte-content",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the editor in sync when switching which item is being edited
  // (e.g. clicking "Edit" on a different module) without fighting the
  // user's cursor while they're actively typing.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor || !imageBucket) return;

    const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from(imageBucket).upload(path, file, { upsert: false });
    if (error) {
      window.alert("Image upload failed. Please try again.");
      return;
    }
    const { data } = supabase.storage.from(imageBucket).getPublicUrl(path);
    editor.chain().focus().setImage({ src: data.publicUrl }).run();
  }

  if (!editor) return null;

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button
          type="button"
          className={editor.isActive("heading", { level: 2 }) ? "rte-btn rte-btn--active" : "rte-btn"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading"
        >
          H2
        </button>
        <button
          type="button"
          className={editor.isActive("heading", { level: 3 }) ? "rte-btn rte-btn--active" : "rte-btn"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Subheading"
        >
          H3
        </button>
        <button
          type="button"
          className={editor.isActive("bold") ? "rte-btn rte-btn--active" : "rte-btn"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={editor.isActive("italic") ? "rte-btn rte-btn--active" : "rte-btn"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={editor.isActive("bulletList") ? "rte-btn rte-btn--active" : "rte-btn"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          • List
        </button>
        <select
          className="rte-select"
          aria-label="Font size"
          value={editor.getAttributes("textStyle").fontSize ?? ""}
          onChange={(e) => {
            const size = e.target.value;
            if (size) {
              editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
            } else {
              editor.chain().focus().setMark("textStyle", { fontSize: null }).run();
            }
          }}
        >
          {FONT_SIZES.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {imageBucket && (
          <>
            <button type="button" className="rte-btn" onClick={() => fileInputRef.current?.click()}>
              🖼 Insert Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelected}
              style={{ display: "none" }}
            />
          </>
        )}
        <button
          type="button"
          className="rte-btn"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          aria-label="Clear formatting"
        >
          Clear
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
