import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { StudentLayout } from './components/StudentLayout';
import { Home } from './pages/Home';
import { Events } from './pages/Events';
import { OfflineEnrollment } from './pages/OfflineEnrollment';
import { BecomeInstructor } from './pages/BecomeInstructor';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { VerifyEmailPending } from './pages/VerifyEmailPending';
import { CertificateVerify } from './pages/CertificateVerify';
import { CourseDetail } from './pages/CourseDetail';
import { Checkout } from './pages/Checkout';
import { Cart } from './pages/Cart';
import { WatchCourse } from './pages/WatchCourse';
import { DashboardIndex } from './pages/dashboard/DashboardIndex';
import { AdminOverview } from './pages/dashboard/AdminOverview';
import { AdminUsers } from './pages/dashboard/AdminUsers';
import { AdminStudentReport } from './pages/dashboard/AdminStudentReport';
import { AdminEnrollments } from './pages/dashboard/AdminEnrollments';
import { AdminCategories } from './pages/dashboard/AdminCategories';
import { AdminCourses } from './pages/dashboard/AdminCourses';
import { AdminPayments } from './pages/dashboard/AdminPayments';
import { AdminReviews } from './pages/dashboard/AdminReviews';
import { AdminCertificates } from './pages/dashboard/AdminCertificates';
import { AdminReports } from './pages/dashboard/AdminReports';
import { AdminSettings } from './pages/dashboard/AdminSettings';
import { AdminAnnouncements } from './pages/dashboard/AdminAnnouncements';
import { AdminOfflineEnrollments } from './pages/dashboard/AdminOfflineEnrollments';
import { TeacherCourses } from './pages/dashboard/TeacherCourses';
import { TeacherEarnings } from './pages/dashboard/TeacherEarnings';
import { TeacherProfile } from './pages/dashboard/TeacherProfile';
import { EditorCourses } from './pages/dashboard/EditorCourses';
import { StudentCourses } from './pages/dashboard/StudentCourses';
import { StudentCertificates } from './pages/dashboard/StudentCertificates';
import { NotificationsCenter } from './pages/dashboard/NotificationsCenter';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/events" element={<Events />} />
      <Route path="/offline-enrollment" element={<OfflineEnrollment />} />
      <Route path="/become-instructor" element={<BecomeInstructor />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-email-pending" element={<VerifyEmailPending />} />
      <Route path="/certificate/verify" element={<CertificateVerify />} />
      <Route path="/certificate/verify/:serial" element={<CertificateVerify />} />
      <Route path="/courses/:id" element={<CourseDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route
        path="/checkout/:courseId"
        element={
          <ProtectedRoute roles={['student', 'admin']}>
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/watch/:courseId"
        element={
          <ProtectedRoute roles={['student', 'admin']}>
            <WatchCourse />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardIndex />} />
        <Route path="notifications" element={<NotificationsCenter />} />
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="admin" element={<AdminOverview />} />
          <Route path="admin/users" element={<AdminUsers initialRoleFilter="student" />} />
          <Route path="admin/users/students" element={<AdminUsers initialRoleFilter="student" />} />
          <Route path="admin/users/teachers" element={<AdminUsers initialRoleFilter="teacher" />} />
          <Route path="admin/users/editors" element={<AdminUsers initialRoleFilter="editor" />} />
          <Route path="admin/users/students/:id/report" element={<AdminStudentReport />} />
          <Route path="admin/enrollments" element={<AdminEnrollments />} />
          <Route path="admin/categories" element={<AdminCategories />} />
          <Route path="admin/courses" element={<AdminCourses />} />
          <Route path="admin/courses/new" element={<AdminCourses />} />
          <Route path="admin/payments" element={<AdminPayments />} />
          <Route path="admin/reports" element={<AdminReports />} />
          <Route path="admin/announcements" element={<AdminAnnouncements />} />
          <Route path="admin/settings" element={<AdminSettings />} />
          <Route path="admin/reviews" element={<AdminReviews />} />
          <Route path="admin/certificates" element={<AdminCertificates />} />
          <Route path="admin/offline-enrollments" element={<AdminOfflineEnrollments />} />
        </Route>
        <Route element={<RoleRoute roles={['teacher']} />}>
          <Route path="teacher/courses" element={<TeacherCourses />} />
          <Route path="teacher/courses/new" element={<TeacherCourses />} />
          <Route path="teacher/earnings" element={<TeacherEarnings />} />
          <Route path="teacher/profile" element={<TeacherProfile />} />
        </Route>
        <Route element={<RoleRoute roles={['editor']} />}>
          <Route path="editor/courses" element={<EditorCourses />} />
          <Route path="editor/courses/new" element={<EditorCourses />} />
        </Route>
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="courses" element={<StudentCourses />} />
        <Route path="certificates" element={<StudentCertificates />} />
      </Route>

      <Route
        path="/dashboard/student/*"
        element={
          <ProtectedRoute roles={['student']}>
            <Navigate to="/student/courses" replace />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
