import { Link, useParams } from "react-router-dom";
import { responsiveImage } from "@/utils/imageUrl";
import { Seo, truncate } from "@/components/Seo";
import { RichContent } from "@/components/RichContent";
import { CustomHtmlArticle } from "@/components/CustomHtmlArticle";
import { BlogCard } from "@/components/ui/BlogCard";
import { useActiveCategories } from "@/hooks/useActiveCategories";
import { useCachedData } from "@/hooks/useCachedData";
import { getPostBySlug, getRelatedPosts } from "@/services/blogService";
import { formatDate } from "@/utils/formatDate";
import { articleMetaDescription, fetchCustomHtml, isImageUrl } from "@/utils/customArticle";
import { setSsrStatus } from "@/lib/httpStatus";
import { articleSchema } from "@/lib/schema";
import { POST_SEO, fitTitle } from "@/content/seoOverrides";
import type { BlogPost } from "@/types/blogPost";
import "@/styles/cards.css";
import "./blog.css";

function plainText(html: string | null): string {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// Engineering/design articles get the simulation course link.
const ENGINEERING_CATEGORIES = ["engineering", "design fundamentals", "dfm", "gd&t", "fea", "ansys"];

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error } = useCachedData(slug ? `post:${slug}` : null, () => getPostBySlug(slug!));
  const post = data ?? null;
  const customUrl = post?.custom_html_url && !isImageUrl(post.custom_html_url) ? post.custom_html_url : null;
  // Same cache entry CustomHtmlArticle renders from — read here for the meta description.
  const { data: customHtml } = useCachedData(customUrl ? `html:${customUrl}` : null, () => fetchCustomHtml(customUrl!));
  const { data: related } = useCachedData(post ? `posts:related:${post.id}` : null, () =>
    getRelatedPosts(post!.category, post!.id).catch(() => [] as BlogPost[])
  );
  const { categories } = useActiveCategories(true);

  if (error) {
    return (
      <section className="section container">
        <p className="section__status">Something went wrong loading this article. Please try again later.</p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="section container" aria-busy="true">
        <p className="section__status">Loading…</p>
      </section>
    );
  }

  if (!post) {
    setSsrStatus(404);
    return (
      <section className="section container" style={{ textAlign: "center" }}>
        <Seo title="Article not found" noindex />
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

  const p = post;
  const relatedCategory = categories?.find((c) => c.name.toLowerCase() === p.category?.toLowerCase());
  const isEngineering = ENGINEERING_CATEGORIES.includes(p.category?.toLowerCase() ?? "");
  const override = POST_SEO[p.slug];
  const excerpt = p.excerpt?.trim() ?? "";
  // Prefer a real excerpt; fall back to the uploaded article's own meta
  // description, then the opening of the body.
  const description = truncate(
    override?.description ||
      (excerpt.length >= 50 ? excerpt : "") ||
      (customHtml ? articleMetaDescription(customHtml) : null) ||
      plainText(p.content) ||
      excerpt ||
      p.title,
    155
  );
  // An image uploaded in place of an article has no indexable text.
  const thin = Boolean(p.custom_html_url && isImageUrl(p.custom_html_url)) || (!p.custom_html_url && !plainText(p.content));

  const seo = (
    <Seo
      title={override?.title ?? fitTitle(p.title)}
      description={description}
      image={p.featured_image || undefined}
      type="article"
      canonical={`/blog/${p.slug}`}
      noindex={thin}
      breadcrumbs={[
        { name: "Blog", path: "/blog" },
        { name: p.title, path: `/blog/${p.slug}` },
      ]}
      jsonLd={articleSchema(p, description)}
    />
  );

  const cta = (
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
      ) : isEngineering ? (
        <>
          <p style={{ marginBottom: "var(--space-4)" }}>
            Learn to check designs like this in simulation — and validate every result by hand.
          </p>
          <Link to="/courses/ansys-workbench-level-1" className="btn btn--primary">
            ANSYS Workbench Course
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
  );

  const relatedSection = related && related.length > 0 && (
    <section className="article-related container">
      <h2 style={{ marginBottom: "var(--space-6)" }}>Related Articles</h2>
      <div className="blog-grid">
        {related.map((r, i) => (
          <BlogCard key={r.id} post={r} index={i} />
        ))}
      </div>
    </section>
  );

  if (p.custom_html_url) {
    return (
      <>
        {seo}
        <CustomHtmlArticle htmlUrl={p.custom_html_url} downloadName={`${p.slug}.html`} title={p.title} />
        {cta}
        {relatedSection}
      </>
    );
  }

  return (
    <>
      {seo}
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
        <img
          {...responsiveImage(p.featured_image, 900)}
          sizes="(max-width: 940px) 100vw, 900px"
          width={900}
          height={506}
          alt={p.title}
          className="article-image"
          decoding="async"
        />
      )}

      <article className="article-body">
        <RichContent content={p.content ?? ""} className="rich-content" />
      </article>

      {cta}
      {relatedSection}
    </>
  );
}
