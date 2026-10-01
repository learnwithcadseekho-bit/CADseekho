import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CourseCard } from "@/components/ui/CourseCard";
import { useActiveCategories } from "@/hooks/useActiveCategories";
import { getPublishedCourses } from "@/services/courseService";
import { useCachedData } from "@/hooks/useCachedData";
import "@/styles/cards.css";

export default function CoursesListingPage() {
  const { data, error: loadError } = useCachedData("courses:published", getPublishedCourses);
  const courses = data ?? null;
  const error = Boolean(loadError);
  const { categories } = useActiveCategories(true);

  return (
    <section className="section container">
      <Seo
        title="ANSYS, SolidWorks & Creo Courses – Online | CADseekho"
        description="ANSYS Workbench FEA, SolidWorks, Creo and AutoCAD courses: live online instructor-led batches plus self-paced options. Compare fees and levels."
        canonical="/courses"
        breadcrumbs={[{ name: "Courses", path: "/courses" }]}
      />
      <SectionHeading
        title="ANSYS, SolidWorks, Creo & AutoCAD Courses"
        subtitle="Simulation and CAD training for students and working engineers — live online classes and self-paced courses."
        align="center"
        as="h1"
      />

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
      {!error && courses === null && (
        <p className="section__status" aria-busy="true">
          Loading courses…
        </p>
      )}
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
