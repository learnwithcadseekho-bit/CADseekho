import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlogCard } from "@/components/ui/BlogCard";
import { getPublishedPosts } from "@/services/blogService";
import type { BlogPost } from "@/types/blogPost";
import "@/styles/cards.css";
import "./blog.css";

export default function BlogListingPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    getPublishedPosts()
      .then(setPosts)
      .catch(() => setError(true));
  }, []);

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
        title="Engineering & CAD Blog"
        description="Practical articles on SolidWorks, AutoCAD, GD&T, DFM, and CAD workflows from CADseekho."
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
      {!error && posts === null && <p className="section__status">Loading articles…</p>}
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
