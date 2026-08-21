import { sanitizeHtml } from "@/utils/sanitizeHtml";

const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

// Renders admin-authored content that may be either real HTML (from the
// RichTextEditor) or legacy plain text (multi-paragraph, blank-line
// separated — how course descriptions and blog posts were stored before the
// rich text editor existed). Detects which and renders accordingly, so
// existing content keeps its original paragraph breaks instead of collapsing
// into one block.
export function RichContent({ content, className }: { content: string; className?: string }) {
  if (HTML_TAG_PATTERN.test(content)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />;
  }

  return (
    <div className={className}>
      {content.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}
