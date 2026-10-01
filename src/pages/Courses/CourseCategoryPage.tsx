import { Link, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CourseCard } from "@/components/ui/CourseCard";
import { getCategoryBySlug } from "@/services/categoryService";
import { getCoursesByCategorySlug } from "@/services/courseService";
import { useCachedData } from "@/hooks/useCachedData";
import { setSsrStatus } from "@/lib/httpStatus";
import "@/styles/cards.css";

type LoadState = "loading" | "not-found" | "error" | "ready";

export default function CourseCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const cat = useCachedData(categorySlug ? `category:${categorySlug}` : null, () => getCategoryBySlug(categorySlug!));
  const list = useCachedData(categorySlug ? `courses:category:${categorySlug}` : null, () =>
    getCoursesByCategorySlug(categorySlug!)
  );
  const category = cat.data ?? null;
  const courses = list.data ?? [];
  const state: LoadState =
    cat.error || list.error
      ? "error"
      : cat.data === undefined || list.data === undefined
        ? "loading"
        : cat.data === null
          ? "not-found"
          : "ready";

  if (state === "loading") {
    return (
      <section className="section container" aria-busy="true">
        <p className="section__status">Loading…</p>
      </section>
    );
  }

  if (state === "not-found") {
    setSsrStatus(404);
    return (
      <section className="section container" style={{ textAlign: "center" }}>
        <Seo title="Category not found" noindex />
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
        title={category!.slug === "ansys" ? "ANSYS Courses – Online Workbench FEA Training | CADseekho" : `${category!.name} Courses – Live & Self-Paced | CADseekho`}
        description={
          category!.description ??
          `${category!.name} courses from CADseekho: practical, project-based training for students and working engineers, live online and self-paced.`
        }
        canonical={`/courses/category/${category!.slug}`}
        breadcrumbs={[
          { name: "Courses", path: "/courses" },
          { name: category!.name, path: `/courses/category/${category!.slug}` },
        ]}
      />
      <SectionHeading
        title={`${category!.name} Courses`}
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
