import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { ProfileTab } from "./ProfileTab";
import { MyCoursesTab } from "./MyCoursesTab";
import { MyLearningTab } from "./MyLearningTab";
import { PurchasesTab } from "./PurchasesTab";
import { AccountSettingsTab } from "./AccountSettingsTab";
import "@/styles/cards.css";
import "./dashboard.css";

const TABS = [
  { key: "learning", label: "My Learning" },
  { key: "profile", label: "My Profile" },
  { key: "courses", label: "Registrations" },
  { key: "purchases", label: "Purchases" },
  { key: "settings", label: "Account Settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function DashboardPage() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  // ?tab=… so links can open a section directly; My Learning is the default.
  const [params, setParams] = useSearchParams();
  const activeTab: TabKey = TABS.find((t) => t.key === params.get("tab"))?.key ?? "learning";
  const setActiveTab = (key: TabKey) => setParams(key === "learning" ? {} : { tab: key }, { replace: true });

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
          {activeTab === "learning" && <MyLearningTab />}
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "courses" && <MyCoursesTab />}
          {activeTab === "purchases" && <PurchasesTab />}
          {activeTab === "settings" && <AccountSettingsTab />}
        </div>
      </div>
    </section>
  );
}
