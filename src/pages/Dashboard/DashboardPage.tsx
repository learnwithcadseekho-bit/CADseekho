import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { ProfileTab } from "./ProfileTab";
import { MyCoursesTab } from "./MyCoursesTab";
import { DownloadsTab } from "./DownloadsTab";
import { AccountSettingsTab } from "./AccountSettingsTab";
import "@/styles/cards.css";
import "./dashboard.css";

const TABS = [
  { key: "profile", label: "My Profile" },
  { key: "courses", label: "My Courses" },
  { key: "downloads", label: "Free Downloads" },
  { key: "settings", label: "Account Settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function DashboardPage() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <section className="section container dashboard">
      <div className="dashboard__header">
        <div>
          <span className="mono-label">DASHBOARD</span>
          <h1 className="dashboard__title">Welcome, {profile?.full_name || user?.email}</h1>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      <div className="dashboard__layout">
        <nav className="dashboard__tabs" aria-label="Dashboard sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`dashboard__tab ${activeTab === tab.key ? "dashboard__tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="dashboard__panel">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "courses" && <MyCoursesTab />}
          {activeTab === "downloads" && <DownloadsTab />}
          {activeTab === "settings" && <AccountSettingsTab />}
        </div>
      </div>
    </section>
  );
}
