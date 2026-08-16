import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CourseCard } from "@/components/ui/CourseCard";
import { useActiveCategories } from "@/hooks/useActiveCategories";
import { getPublishedCourses } from "@/services/courseService";
import type { CourseWithCategory } from "@/types/course";
import "@/styles/cards.css";

export default function CoursesListingPage() {
  const [courses, setCourses] = useState<CourseWithCategory[] | null>(null);
  const [error, setError] = useState(false);
  const { categories } = useActiveCategories(true);

  useEffect(() => {
    getPublishedCourses()
      .then(setCourses)
      .catch(() => setError(true));
  }, []);

  return (
    <section className="section container">
      <Seo
        title="Browse Courses"
        description="Explore AutoCAD, SolidWorks, and other practical CAD and engineering training courses from CADseekho."
      />
      <SectionHeading number="01" eyebrow="ALL COURSES" title="Browse Courses" align="center" as="h1" />

      {categories && categories.length > 0 && (
        <div className="course-filter-chips">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/courses/category/${cat.slug}`} className="course-filter-chip">
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {error && <p className="section__status">Courses are temporarily unavailable. Please try again later.</p>}
      {!error && courses === null && <p className="section__status">Loading courses…</p>}
      {!error && courses?.length === 0 && <p className="section__status">No courses are published yet.</p>}

      {!error && courses && courses.length > 0 && (
        <div className="course-grid">
          {courses.map((course, i) => (
            <CourseCard key={course.id} course={course} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
