import { Link } from "react-router-dom";
import { PlaceholderArt } from "./PlaceholderArt";
import { formatDate } from "@/utils/formatDate";
import type { BlogPost } from "@/types/blogPost";
import "@/styles/drafting.css";

// Fall back to the opening of the post body when no excerpt was set, so a card
// never renders as a title floating over empty white space.
function deriveExcerpt(html: string | null): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

export function BlogCard({ post, index }: { post: BlogPost; index: number }) {
  const excerpt = post.excerpt?.trim() || deriveExcerpt(post.content);

  return (
    <Link to={`/blog/${post.slug}`} className="blog-card drafting-frame drafting-frame--interactive">
      {post.featured_image ? (
        <img
          src={post.featured_image}
          alt={post.title}
          className="blog-card__image"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <PlaceholderArt label={(post.category ?? "ARTICLE").toUpperCase()} seed={index} />
      )}
      <div className="blog-card__body">
        {post.category && <span className="mono-label">{post.category}</span>}
        <h3 className="blog-card__title">{post.title}</h3>
        {excerpt && <p className="blog-card__excerpt">{excerpt}</p>}
        <div className="blog-card__footer">
          <span className="mono-label">{formatDate(post.published_at ?? post.created_at)}</span>
          <span className="blog-card__cta">Read More →</span>
        </div>
      </div>
    </Link>
  );
}
