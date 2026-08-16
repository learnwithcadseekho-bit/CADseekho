import { Link } from "react-router-dom";
import { PlaceholderArt } from "./PlaceholderArt";
import { COURSE_LEVEL_LABEL, type CourseWithCategory } from "@/types/course";
import "@/styles/drafting.css";

export function CourseCard({ course, index }: { course: CourseWithCategory; index: number }) {
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="course-card drafting-frame drafting-frame--interactive"
    >
      {course.image ? (
        <img
          src={course.image}
          alt={course.title}
          className="course-card__image"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <PlaceholderArt label={course.slug.toUpperCase()} seed={index} />
      )}
      <div className="course-card__body">
        {course.category && <span className="mono-label">{course.category.name}</span>}
        <h3 className="course-card__title">{course.title}</h3>
        <p className="course-card__desc">{course.short_description}</p>
        <div className="course-card__footer">
          {course.level && (
            <span className="course-card__level">{COURSE_LEVEL_LABEL[course.level]}</span>
          )}
          <span className="course-card__cta">View Course →</span>
        </div>
      </div>
    </Link>
  );
}
