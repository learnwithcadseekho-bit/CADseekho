import { useEffect, useState } from "react";
import { StatTile } from "@/admin/components/StatTile";
import { getOverviewStats, type OverviewStats } from "@/services/admin/adminStatsService";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getOverviewStats()
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  return (
    <div>
      <div className="admin-page-header">
        <h1>Overview</h1>
      </div>

      {error && <p>Couldn't load stats.</p>}
      {!error && !stats && <p>Loading…</p>}

      {stats && (
        <div className="admin-stats-grid">
          <StatTile label="Total Users" value={stats.totalUsers} />
          <StatTile label="Course Registrations" value={stats.courseRegistrations} />
          <StatTile label="Total Downloads" value={stats.totalDownloads} />
          <StatTile label="Blog Posts" value={stats.blogPosts} />
          <StatTile label="Published Courses" value={stats.publishedCourses} />
        </div>
      )}
    </div>
  );
}
