import { Link } from "react-router-dom";
import { PlaceholderArt } from "./PlaceholderArt";
import type { CategoryWithCourseCount } from "@/services/categoryService";
import "@/styles/drafting.css";

export function CategoryCard({ category, index }: { category: CategoryWithCourseCount; index: number }) {
  const isComingSoon = category.course_count === 0;

  return (
    <Link
      to={`/courses/category/${category.slug}`}
      className="category-card drafting-frame drafting-frame--interactive"
    >
      {category.image ? (
        <img
          src={category.image}
          alt={category.name}
          className="category-card__image"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <PlaceholderArt label={category.slug.toUpperCase()} seed={index} />
      )}
      <div className="category-card__body">
        <h3 className="category-card__name">{category.name}</h3>
        <p className="category-card__desc">{category.description}</p>
        <div className="category-card__footer">
          <span className="mono-label">
            {isComingSoon ? "Coming Soon" : `${category.course_count} course${category.course_count === 1 ? "" : "s"}`}
          </span>
          <span className="category-card__cta">View Courses →</span>
        </div>
      </div>
    </Link>
  );
}
