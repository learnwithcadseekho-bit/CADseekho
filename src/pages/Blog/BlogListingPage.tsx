import { useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlogCard } from "@/components/ui/BlogCard";
import { getPublishedPosts } from "@/services/blogService";
import { useCachedData } from "@/hooks/useCachedData";
import "@/styles/cards.css";
import "./blog.css";

export default function BlogListingPage() {
  const { data, error: loadError } = useCachedData("posts:published", getPublishedPosts);
  const posts = data ?? null;
  const error = Boolean(loadError);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!posts) return [];
    return Array.from(new Set(posts.map((p) => p.category).filter((c): c is string => Boolean(c))));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    return activeCategory ? posts.filter((p) => p.category === activeCategory) : posts;
  }, [posts, activeCategory]);

  return (
    <section className="section container">
      <Seo
        title="Engineering, FEA & CAD Blog | CADseekho"
        description="Practical articles on design for manufacturing, stress concentration, GD&T, SolidWorks and AutoCAD workflows, from engineers who teach ANSYS and CAD."
        canonical="/blog"
        breadcrumbs={[{ name: "Blog", path: "/blog" }]}
      />
      <SectionHeading title="Engineering & CAD Blog" align="center" as="h1" />

      {categories.length > 0 && (
        <div className="course-filter-chips">
          <button
            type="button"
            className={`course-filter-chip ${activeCategory === null ? "course-filter-chip--active" : ""}`}
            onClick={() => setActiveCategory(null)}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`course-filter-chip ${activeCategory === cat ? "course-filter-chip--active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {error && <p className="section__status">The blog is temporarily unavailable. Please try again later.</p>}
      {!error && posts === null && (
        <p className="section__status" aria-busy="true">
          Loading articles…
        </p>
      )}
      {!error && posts?.length === 0 && <p className="section__status">No articles published yet.</p>}

      {!error && filteredPosts.length > 0 && (
        <div className="blog-grid">
          {filteredPosts.map((post, i) => (
            <BlogCard key={post.id} post={post} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
