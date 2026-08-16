import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getMyRegistrations, type RegistrationWithCourse } from "@/services/courseRegistrationService";

const STATUS_LABEL: Record<string, string> = {
  registered: "Registered",
  contacted: "Contacted",
  enrolled: "Enrolled",
  cancelled: "Cancelled",
};

export function MyCoursesTab() {
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
          </div>
          <div className="dashboard-list__meta">
            <span className="mono-label">{STATUS_LABEL[reg.status]}</span>
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
