import { Link } from "react-router-dom";
import { PlaceholderArt } from "./PlaceholderArt";
import { formatDate } from "@/utils/formatDate";
import type { BlogPost } from "@/types/blogPost";
import "@/styles/drafting.css";

export function BlogCard({ post, index }: { post: BlogPost; index: number }) {
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
        {post.excerpt && <p className="blog-card__excerpt">{post.excerpt}</p>}
        <div className="blog-card__footer">
          <span className="mono-label">{formatDate(post.published_at ?? post.created_at)}</span>
          <span className="blog-card__cta">Read More →</span>
        </div>
      </div>
    </Link>
  );
}
