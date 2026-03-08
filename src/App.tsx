import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import LessonPlayer from "./pages/LessonPlayer";
import Quizzes from "./pages/Quizzes";
import QuizPlayer from "./pages/QuizPlayer";
import QuizManage from "./pages/QuizManage";
import Progress from "./pages/Progress";
import Leaderboard from "./pages/Leaderboard";
import Discussions from "./pages/Discussions";
import Analytics from "./pages/Analytics";
import AITutor from "./pages/AITutor";
import UsersPage from "./pages/Users";
import Announcements from "./pages/Announcements";
import SettingsPage from "./pages/Settings";
import Reports from "./pages/Reports";
import StudentsPage from "./pages/Students";
import LiveClasses from "./pages/LiveClasses";
import LiveClassRoom from "./pages/LiveClassRoom";
import Attendance from "./pages/Attendance";
import Assignments from "./pages/Assignments";
import Marks from "./pages/Marks";
import AdminPanel from "./pages/AdminPanel";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/dashboard/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
    <Route path="/dashboard/courses/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
    <Route path="/dashboard/courses/:courseId/lessons/:lessonId" element={<ProtectedRoute><LessonPlayer /></ProtectedRoute>} />
    <Route path="/dashboard/quizzes" element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
    <Route path="/dashboard/quizzes/:quizId" element={<ProtectedRoute><QuizPlayer /></ProtectedRoute>} />
    <Route path="/dashboard/quizzes/:quizId/manage" element={<ProtectedRoute><QuizManage /></ProtectedRoute>} />
    <Route path="/dashboard/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
    <Route path="/dashboard/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
    <Route path="/dashboard/discussions" element={<ProtectedRoute><Discussions /></ProtectedRoute>} />
    <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
    <Route path="/dashboard/ai-tutor" element={<ProtectedRoute><AITutor /></ProtectedRoute>} />
    <Route path="/dashboard/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
    <Route path="/dashboard/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
    <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    <Route path="/dashboard/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/dashboard/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
    <Route path="/dashboard/live-classes" element={<ProtectedRoute><LiveClasses /></ProtectedRoute>} />
    <Route path="/dashboard/live-classes/:classId" element={<ProtectedRoute><LiveClassRoom /></ProtectedRoute>} />
    <Route path="/dashboard/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
    <Route path="/dashboard/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />
    <Route path="/dashboard/marks" element={<ProtectedRoute><Marks /></ProtectedRoute>} />
    <Route path="/dashboard/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
