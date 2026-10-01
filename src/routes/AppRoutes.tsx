import { lazy, Suspense } from "react";
import { trackedLazy } from "@/lib/trackedLazy";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
// The landing page ships with the app shell (not code-split) so the most common
// entry point paints straight after the main bundle, with no second round-trip
// for a route chunk.
import HomePage from "@/pages/Home/HomePage";

// Every other public page is code-split per route so a visit to any one page
// only downloads and parses that page's JS, not the entire site (previously all
// pages shipped in a single ~480KB chunk loaded before any page could paint).
// trackedLazy (not React.lazy) so the build-time prerender knows which route
// chunk's CSS to link in each page's HTML — the id is the module's path.
const CoursesListingPage = trackedLazy("src/pages/Courses/CoursesListingPage.tsx", () => import("@/pages/Courses/CoursesListingPage"));
const CourseCategoryPage = trackedLazy("src/pages/Courses/CourseCategoryPage.tsx", () => import("@/pages/Courses/CourseCategoryPage"));
const CourseDetailPage = trackedLazy("src/pages/CourseDetails/CourseDetailPage.tsx", () => import("@/pages/CourseDetails/CourseDetailPage"));
const ResourcesHubPage = trackedLazy("src/pages/Resources/ResourcesHubPage.tsx", () => import("@/pages/Resources/ResourcesHubPage"));
const ResourceSoftwarePage = trackedLazy("src/pages/Resources/ResourceSoftwarePage.tsx", () => import("@/pages/Resources/ResourceSoftwarePage"));
const ResourceTaxonomyPage = trackedLazy("src/pages/Resources/ResourceTaxonomyPage.tsx", () => import("@/pages/Resources/ResourceTaxonomyPage"));
const ResourceDetailPage = trackedLazy("src/pages/Resources/ResourceDetailPage.tsx", () => import("@/pages/Resources/ResourceDetailPage"));
const BeamCalculatorPage = trackedLazy("src/pages/tools/BeamCalculatorPage.tsx", () => import("@/pages/tools/BeamCalculatorPage"));
const BlogListingPage = trackedLazy("src/pages/Blog/BlogListingPage.tsx", () => import("@/pages/Blog/BlogListingPage"));
const BlogPostPage = trackedLazy("src/pages/Blog/BlogPostPage.tsx", () => import("@/pages/Blog/BlogPostPage"));
const AboutPage = trackedLazy("src/pages/About/AboutPage.tsx", () => import("@/pages/About/AboutPage"));
const ContactPage = trackedLazy("src/pages/Contact/ContactPage.tsx", () => import("@/pages/Contact/ContactPage"));
const LoginPage = trackedLazy("src/pages/Login/LoginPage.tsx", () => import("@/pages/Login/LoginPage"));
const SignupPage = trackedLazy("src/pages/Signup/SignupPage.tsx", () => import("@/pages/Signup/SignupPage"));
const ForgotPasswordPage = trackedLazy("src/pages/Login/ForgotPasswordPage.tsx", () => import("@/pages/Login/ForgotPasswordPage"));
const ResetPasswordPage = trackedLazy("src/pages/Login/ResetPasswordPage.tsx", () => import("@/pages/Login/ResetPasswordPage"));
const DashboardPage = trackedLazy("src/pages/Dashboard/DashboardPage.tsx", () => import("@/pages/Dashboard/DashboardPage"));
const LiveClassPage = trackedLazy("src/pages/Classroom/LiveClassPage.tsx", () => import("@/pages/Classroom/LiveClassPage"));
const LocalLandingPage = trackedLazy("src/pages/Local/LocalLandingPage.tsx", () => import("@/pages/Local/LocalLandingPage"));
const NotFoundPage = trackedLazy("src/pages/NotFound/NotFoundPage.tsx", () => import("@/pages/NotFound/NotFoundPage"));

// Admin is a large CRUD surface only admins ever load — code-split it out of
// the main bundle every visitor downloads (Section 28).
const AdminLayout = lazy(() => import("@/admin/layout/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminOverviewPage = lazy(() => import("@/admin/Dashboard/AdminOverviewPage"));
const AdminCategoriesPage = lazy(() => import("@/admin/Categories/AdminCategoriesPage"));
const AdminCoursesPage = lazy(() => import("@/admin/Courses/AdminCoursesPage"));
const AdminCourseEditPage = lazy(() => import("@/admin/Courses/AdminCourseEditPage"));
const AdminDownloadsPage = lazy(() => import("@/admin/Downloads/AdminDownloadsPage"));
const AdminResourcesPage = lazy(() => import("@/admin/Resources/AdminResourcesPage"));
const AdminResourceEditPage = lazy(() => import("@/admin/Resources/AdminResourceEditPage"));
const AdminResourceTaxonomyPage = lazy(() => import("@/admin/Resources/AdminResourceTaxonomyPage"));
const AdminLearningPathsPage = lazy(() => import("@/admin/Resources/AdminLearningPathsPage"));
const AdminEntitlementsPage = lazy(() => import("@/admin/Resources/AdminEntitlementsPage"));
const AdminBlogPage = lazy(() => import("@/admin/Blog/AdminBlogPage"));
const AdminUsersPage = lazy(() => import("@/admin/Users/AdminUsersPage"));
const AdminMessagesPage = lazy(() => import("@/admin/Messages/AdminMessagesPage"));

function AdminLoading() {
  return <div style={{ padding: "var(--space-16)", textAlign: "center", color: "var(--slate)" }}>Loading admin…</div>;
}

function PageLoading() {
  return <div style={{ padding: "var(--space-16)", textAlign: "center", color: "var(--slate)" }}>Loading…</div>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesListingPage />} />
        <Route path="/courses/category/:categorySlug" element={<CourseCategoryPage />} />
        <Route path="/courses/:slug" element={<CourseDetailPage />} />
        <Route path="/downloads" element={<Navigate to="/resources" replace />} />
        <Route path="/resources" element={<ResourcesHubPage />} />
        <Route path="/resources/software/:software" element={<ResourceSoftwarePage />} />
        <Route path="/resources/topic/:value" element={<ResourceTaxonomyPage kind="topic" />} />
        <Route path="/resources/type/:value" element={<ResourceTaxonomyPage kind="type" />} />
        <Route path="/resources/:slug" element={<ResourceDetailPage />} />
        <Route path="/tools/beam-calculator" element={<BeamCalculatorPage />} />
        <Route path="/blog" element={<BlogListingPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/ansys-training-delhi-ncr" element={<LocalLandingPage area="delhi-ncr" />} />
        <Route path="/ansys-training-delhi" element={<LocalLandingPage area="delhi" />} />
        <Route path="/ansys-training-noida" element={<LocalLandingPage area="noida" />} />
        <Route path="/ansys-training-gurgaon" element={<LocalLandingPage area="gurgaon" />} />
        <Route path="/ansys-training-ghaziabad" element={<LocalLandingPage area="ghaziabad" />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classroom/:slug"
          element={
            <ProtectedRoute>
              <LiveClassPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/login"
        element={
          <Suspense fallback={<PageLoading />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/signup"
        element={
          <Suspense fallback={<PageLoading />}>
            <SignupPage />
          </Suspense>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <Suspense fallback={<PageLoading />}>
            <ForgotPasswordPage />
          </Suspense>
        }
      />
      <Route
        path="/reset-password"
        element={
          <Suspense fallback={<PageLoading />}>
            <ResetPasswordPage />
          </Suspense>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Suspense fallback={<AdminLoading />}>
              <AdminLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="courses" element={<AdminCoursesPage />} />
        <Route path="courses/:id" element={<AdminCourseEditPage />} />
        <Route path="downloads" element={<AdminDownloadsPage />} />
        <Route path="resources" element={<AdminResourcesPage />} />
        <Route path="resources/taxonomy" element={<AdminResourceTaxonomyPage />} />
        <Route path="resources/paths" element={<AdminLearningPathsPage />} />
        <Route path="resources/access" element={<AdminEntitlementsPage />} />
        <Route path="resources/:id" element={<AdminResourceEditPage />} />
        <Route path="blog" element={<AdminBlogPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="messages" element={<AdminMessagesPage />} />
      </Route>
    </Routes>
  );
}
