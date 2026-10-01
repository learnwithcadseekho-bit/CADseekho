import { SectionHeading } from "@/components/ui/SectionHeading";
import { CourseCard } from "@/components/ui/CourseCard";
import { getFeaturedCourses } from "@/services/courseService";
import { useCachedData } from "@/hooks/useCachedData";
import "./home.css";

export function FeaturedCoursesSection() {
  const { data, error: loadError } = useCachedData("courses:featured", getFeaturedCourses);
  const courses = data ?? null;
  const error = Boolean(loadError);

  // Nothing published/featured yet (e.g. before migrations are seeded) —
  // omit the section rather than show an empty shell.
  if (!error && courses?.length === 0) return null;

  return (
    <section className="section container">
      <SectionHeading title="Featured Courses" align="center" />

      {error && <p className="section__status">Featured courses are temporarily unavailable.</p>}
      {!error && courses === null && (
        <p className="section__status" aria-busy="true">
          Loading courses…
        </p>
      )}

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
