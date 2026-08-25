import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Every public page is code-split per route so a visit to any one page only
// downloads and parses that page's JS, not the entire site (previously all
// pages shipped in a single ~480KB chunk loaded before any page could paint).
const HomePage = lazy(() => import("@/pages/Home/HomePage"));
const CoursesListingPage = lazy(() => import("@/pages/Courses/CoursesListingPage"));
const CourseCategoryPage = lazy(() => import("@/pages/Courses/CourseCategoryPage"));
const CourseDetailPage = lazy(() => import("@/pages/CourseDetails/CourseDetailPage"));
const DownloadsPage = lazy(() => import("@/pages/Downloads/DownloadsPage"));
const BlogListingPage = lazy(() => import("@/pages/Blog/BlogListingPage"));
const BlogPostPage = lazy(() => import("@/pages/Blog/BlogPostPage"));
const AboutPage = lazy(() => import("@/pages/About/AboutPage"));
const ContactPage = lazy(() => import("@/pages/Contact/ContactPage"));
const LoginPage = lazy(() => import("@/pages/Login/LoginPage"));
const SignupPage = lazy(() => import("@/pages/Signup/SignupPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/Login/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/Login/ResetPasswordPage"));
const DashboardPage = lazy(() => import("@/pages/Dashboard/DashboardPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFound/NotFoundPage"));

// Admin is a large CRUD surface only admins ever load — code-split it out of
// the main bundle every visitor downloads (Section 28).
const AdminLayout = lazy(() => import("@/admin/layout/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminOverviewPage = lazy(() => import("@/admin/Dashboard/AdminOverviewPage"));
const AdminCategoriesPage = lazy(() => import("@/admin/Categories/AdminCategoriesPage"));
const AdminCoursesPage = lazy(() => import("@/admin/Courses/AdminCoursesPage"));
const AdminCourseEditPage = lazy(() => import("@/admin/Courses/AdminCourseEditPage"));
const AdminDownloadsPage = lazy(() => import("@/admin/Downloads/AdminDownloadsPage"));
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
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/blog" element={<BlogListingPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
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
        <Route path="blog" element={<AdminBlogPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="messages" element={<AdminMessagesPage />} />
      </Route>
    </Routes>
  );
}
