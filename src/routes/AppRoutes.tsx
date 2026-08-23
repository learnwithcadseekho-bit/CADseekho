import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import HomePage from "@/pages/Home/HomePage";
import CoursesListingPage from "@/pages/Courses/CoursesListingPage";
import CourseCategoryPage from "@/pages/Courses/CourseCategoryPage";
import CourseDetailPage from "@/pages/CourseDetails/CourseDetailPage";
import DownloadsPage from "@/pages/Downloads/DownloadsPage";
import BlogListingPage from "@/pages/Blog/BlogListingPage";
import BlogPostPage from "@/pages/Blog/BlogPostPage";
import AboutPage from "@/pages/About/AboutPage";
import ContactPage from "@/pages/Contact/ContactPage";
import LoginPage from "@/pages/Login/LoginPage";
import SignupPage from "@/pages/Signup/SignupPage";
import ForgotPasswordPage from "@/pages/Login/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/Login/ResetPasswordPage";
import DashboardPage from "@/pages/Dashboard/DashboardPage";
import NotFoundPage from "@/pages/NotFound/NotFoundPage";

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

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

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
