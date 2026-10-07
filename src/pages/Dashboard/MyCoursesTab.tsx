import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getMyRegistrations, type RegistrationWithCourse } from "@/services/courseRegistrationService";
import { getPublishedCourses } from "@/services/courseService";
import type { CourseWithCategory } from "@/types/course";

const STATUS_LABEL: Record<string, string> = {
  registered: "Registered",
  contacted: "Contacted",
  enrolled: "Enrolled",
  cancelled: "Cancelled",
};

export function MyCoursesTab() {
  const { profile } = useAuth();
  // Admins get every course without paying — see AdminCourseList.
  if (profile?.role === "admin") return <AdminCourseList />;
  return <StudentCourseList />;
}

// Admins can open any course's live class (zoom-join lets them in without a
// registration), so list every published course instead of registrations.
function AdminCourseList() {
  const [courses, setCourses] = useState<CourseWithCategory[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPublishedCourses()
      .then(setCourses)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="section__status">Couldn't load courses. Please try again later.</p>;
  if (courses === null) return <p className="section__status">Loading…</p>;
  if (courses.length === 0) return <p className="section__status">No published courses yet.</p>;

  return (
    <ul className="dashboard-list">
      {courses.map((course) => (
        <li key={course.id} className="dashboard-list__item">
          <div>
            {course.category && <span className="mono-label">{course.category.name}</span>}
            <p className="dashboard-list__title">{course.title}</p>
          </div>
          <div className="dashboard-list__meta">
            <span className="mono-label">Admin access</span>
            {course.format === "live" && (
              <Link to={`/classroom/${course.slug}`} className="btn btn--primary">
                Join Live Class
              </Link>
            )}
            <Link to={`/courses/${course.slug}`} className="dashboard-list__link">
              View Course →
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StudentCourseList() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationWithCourse[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMyRegistrations(user.id)
      .then(setRegistrations)
      .catch(() => setError(true));
  }, [user]);

  if (error) return <p className="section__status">Couldn't load your courses. Please try again later.</p>;
  if (registrations === null) return <p className="section__status">Loading…</p>;

  if (registrations.length === 0) {
    return (
      <div className="dashboard-empty">
        <p>You haven't registered for any courses yet.</p>
        <Link to="/courses" className="btn btn--primary">
          Browse Courses
        </Link>
      </div>
    );
  }

  return (
    <ul className="dashboard-list">
      {registrations.map((reg) => (
        <li key={reg.id} className="dashboard-list__item">
          <div>
            {reg.course?.category && <span className="mono-label">{reg.course.category.name}</span>}
            <p className="dashboard-list__title">{reg.course?.title ?? "Course"}</p>
            {reg.course?.format === "live" && reg.status === "enrolled" && reg.course.live_class_schedule && (
              <p className="dashboard-list__schedule">{reg.course.live_class_schedule}</p>
            )}
          </div>
          <div className="dashboard-list__meta">
            <span className="mono-label">{STATUS_LABEL[reg.status]}</span>
            {reg.course?.format === "live" && reg.status === "enrolled" && (
              <Link to={`/classroom/${reg.course.slug}`} className="btn btn--primary">
                Join Live Class
              </Link>
            )}
            {reg.course && (
              <Link to={`/courses/${reg.course.slug}`} className="dashboard-list__link">
                View Course →
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
