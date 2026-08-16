import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/admin/components/ConfirmDeleteButton";
import { deleteCourse, listAllCourses, updateCourse } from "@/services/admin/adminCourseService";
import type { CourseWithCategory } from "@/types/course";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listAllCourses()
      .then(setCourses)
      .catch(() => setError("Couldn't load courses."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function togglePublished(course: CourseWithCategory) {
    try {
      await updateCourse(course.id, { is_published: !course.is_published });
      load();
    } catch {
      setError("Couldn't update publish status.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCourse(id);
      load();
    } catch {
      setError("Couldn't delete this course.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Courses</h1>
        <Link to="/admin/courses/new">
          <Button>+ New Course</Button>
        </Link>
      </div>

      {error && <p className="field__error">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Level</th>
                <th>Featured</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>{course.title}</td>
                  <td>{course.category?.name ?? "—"}</td>
                  <td>{course.level ?? "—"}</td>
                  <td>{course.is_featured ? "Yes" : "No"}</td>
                  <td>
                    <button
                      type="button"
                      className={`admin-badge ${course.is_published ? "admin-badge--on" : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => togglePublished(course)}
                    >
                      {course.is_published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td>
                    <Link to={`/admin/courses/${course.id}`} className="admin-link">
                      Edit
                    </Link>
                    <ConfirmDeleteButton onConfirm={() => handleDelete(course.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
