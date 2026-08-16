import { SectionHeading } from "@/components/ui/SectionHeading";
import { CategoryCard } from "@/components/ui/CategoryCard";
import { useActiveCategories } from "@/hooks/useActiveCategories";
import "./home.css";

export function CategorySection() {
  const { categories, loading, error } = useActiveCategories(true);

  return (
    <section className="section container">
      <SectionHeading
        number="01"
        eyebrow="COURSE CATEGORIES"
        title="Explore Our Courses"
        align="center"
      />

      {loading && <p className="section__status">Loading categories…</p>}
      {error && <p className="section__status">Course categories are temporarily unavailable.</p>}
      {!loading && !error && categories?.length === 0 && (
        <p className="section__status">Course categories will appear here soon.</p>
      )}

      {!loading && !error && categories && categories.length > 0 && (
        <div className="category-grid">
          {categories.map((cat, i) => (
            <CategoryCard key={cat.id} category={cat} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
