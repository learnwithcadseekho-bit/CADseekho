import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { RichContent } from "@/components/RichContent";
import { BlogCard } from "@/components/ui/BlogCard";
import { useActiveCategories } from "@/hooks/useActiveCategories";
import { getPostBySlug, getRelatedPosts } from "@/services/blogService";
import { formatDate } from "@/utils/formatDate";
import type { BlogPost } from "@/types/blogPost";
import "@/styles/cards.css";
import "./blog.css";

type LoadState = "loading" | "not-found" | "error" | "ready";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const { categories } = useActiveCategories(true);

  useEffect(() => {
    if (!slug) return;
    setState("loading");
    getPostBySlug(slug)
      .then(async (p) => {
        if (!p) {
          setState("not-found");
          return;
        }
        setPost(p);
        setState("ready");
        try {
          setRelated(await getRelatedPosts(p.category, p.id));
        } catch {
          setRelated([]);
        }
      })
      .catch(() => setState("error"));
  }, [slug]);

  if (state === "loading") {
    return (
      <section className="section container">
        <p className="section__status">Loading…</p>
      </section>
    );
  }

  if (state === "not-found") {
    return (
      <section className="section container" style={{ textAlign: "center" }}>
        <span className="mono-label">ERROR — 404</span>
        <h1 style={{ marginTop: "var(--space-2)" }}>Article not found</h1>
        <p style={{ marginTop: "var(--space-4)" }}>
          <Link to="/blog" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Back to blog →
          </Link>
        </p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="section container">
        <p className="section__status">Something went wrong loading this article. Please try again later.</p>
      </section>
    );
  }

  const p = post!;
  const relatedCategory = categories?.find((c) => c.name.toLowerCase() === p.category?.toLowerCase());

  return (
    <>
      <Seo
        title={p.title}
        description={p.excerpt ?? undefined}
        image={p.featured_image ?? undefined}
        type="article"
      />
      <section className="article-hero">
        <div className="container article-hero__inner">
          {p.category && <span className="mono-label">{p.category}</span>}
          <h1 className="article-hero__title">{p.title}</h1>
          <div className="article-hero__meta mono-label">
            <span>CADseekho Team</span>
            <span>{formatDate(p.published_at ?? p.created_at)}</span>
          </div>
        </div>
      </section>

      {p.featured_image && (
        <img src={p.featured_image} alt={p.title} className="article-image" loading="lazy" decoding="async" />
      )}

      <article className="article-body">
        <RichContent content={p.content ?? ""} className="rich-content" />
      </article>

      <div className="article-cta">
        {relatedCategory ? (
          <>
            <p style={{ marginBottom: "var(--space-4)" }}>
              Want to build these skills hands-on? Explore our {relatedCategory.name} courses.
            </p>
            <Link to={`/courses/category/${relatedCategory.slug}`} className="btn btn--primary">
              Explore {relatedCategory.name} Courses
            </Link>
          </>
        ) : (
          <>
            <p style={{ marginBottom: "var(--space-4)" }}>Ready to build practical CAD skills?</p>
            <Link to="/courses" className="btn btn--primary">
              Browse All Courses
            </Link>
          </>
        )}
      </div>

      {related.length > 0 && (
        <section className="article-related container">
          <h2 style={{ marginBottom: "var(--space-6)" }}>Related Articles</h2>
          <div className="blog-grid">
            {related.map((r, i) => (
              <BlogCard key={r.id} post={r} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
