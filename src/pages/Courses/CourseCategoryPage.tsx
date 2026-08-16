import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CourseCard } from "@/components/ui/CourseCard";
import { getCategoryBySlug } from "@/services/categoryService";
import { getCoursesByCategorySlug } from "@/services/courseService";
import type { Category } from "@/types/category";
import type { CourseWithCategory } from "@/types/course";
import "@/styles/cards.css";

type LoadState = "loading" | "not-found" | "error" | "ready";

export default function CourseCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [courses, setCourses] = useState<CourseWithCategory[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    if (!categorySlug) return;
    setState("loading");

    Promise.all([getCategoryBySlug(categorySlug), getCoursesByCategorySlug(categorySlug)])
      .then(([cat, courseList]) => {
        if (!cat) {
          setState("not-found");
          return;
        }
        setCategory(cat);
        setCourses(courseList);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [categorySlug]);

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
        <h1 style={{ marginTop: "var(--space-2)" }}>Category not found</h1>
        <p style={{ marginTop: "var(--space-4)" }}>
          <Link to="/courses" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Browse all courses →
          </Link>
        </p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="section container">
        <p className="section__status">Something went wrong loading this category. Please try again later.</p>
      </section>
    );
  }

  return (
    <section className="section container">
      <Seo
        title={`${category!.name} Courses`}
        description={category!.description ?? `Browse ${category!.name} courses from CADseekho.`}
      />
      <SectionHeading
        number="01"
        eyebrow="COURSE CATEGORY"
        title={category!.name}
        subtitle={category!.description ?? undefined}
        align="center"
        as="h1"
      />

      {courses.length === 0 ? (
        <p className="section__status">
          Courses in this category are coming soon. In the meantime, explore our{" "}
          <Link to="/courses" style={{ color: "var(--accent)", fontWeight: 600 }}>
            full course catalog
          </Link>
          .
        </p>
      ) : (
        <div className="course-grid">
          {courses.map((course, i) => (
            <CourseCard key={course.id} course={course} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
