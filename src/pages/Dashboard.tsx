import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Users, BarChart3, Trophy, TrendingUp, Clock,
  Award, Flame, Target, GraduationCap, ArrowUpRight,
} from "lucide-react";

// Stat card component
function StatCard({ icon: Icon, label, value, trend, color }: {
  icon: any; label: string; value: string | number; trend?: string; color?: string;
}) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || "gradient-primary"}`}>
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-success flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// Admin Dashboard
function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, courses: 0, enrollments: 0, completionRate: 0 });
  const [recentActivity, setRecentActivity] = useState<{ text: string; time: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [u, c, e] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("progress, completed_at"),
      ]);
      const enrollmentData = e.data || [];
      const completed = enrollmentData.filter((en: any) => en.completed_at).length;
      const rate = enrollmentData.length > 0 ? Math.round((completed / enrollmentData.length) * 100) : 0;
      setStats({ users: u.count || 0, courses: c.count || 0, enrollments: enrollmentData.length, completionRate: rate });

      // Recent activity: latest enrollments, courses, and user signups
      const [recentEnrollments, recentCourses, recentUsers] = await Promise.all([
        supabase.from("enrollments").select("enrolled_at, courses(title), profiles!enrollments_user_id_profiles_fkey(full_name)").order("enrolled_at", { ascending: false }).limit(3),
        supabase.from("courses").select("title, created_at").order("created_at", { ascending: false }).limit(2),
        supabase.from("profiles").select("full_name, created_at").order("created_at", { ascending: false }).limit(2),
      ]);

      const activities: { text: string; time: string }[] = [];
      (recentUsers.data || []).forEach((u: any) => {
        activities.push({ text: `${u.full_name || "New user"} registered`, time: u.created_at });
      });
      (recentCourses.data || []).forEach((c: any) => {
        activities.push({ text: `Course '${c.title}' created`, time: c.created_at });
      });
      (recentEnrollments.data || []).forEach((en: any) => {
        activities.push({ text: `${(en.profiles as any)?.full_name || "Student"} enrolled in '${(en.courses as any)?.title || "a course"}'`, time: en.enrolled_at });
      });
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activities.slice(0, 5));
    };
    load();
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-6">Platform overview and management</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Users" value={stats.users} />
        <StatCard icon={BookOpen} label="Total Courses" value={stats.courses} />
        <StatCard icon={GraduationCap} label="Enrollments" value={stats.enrollments} />
        <StatCard icon={BarChart3} label="Completion Rate" value={`${stats.completionRate}%`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            ) : recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-foreground">{a.text}</span>
                <span className="text-xs text-muted-foreground ml-auto">{timeAgo(a.time)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Course Breakdown</h3>
          <CourseBreakdown />
        </div>
      </div>
    </div>
  );
}

function CourseBreakdown() {
  const [courses, setCourses] = useState<{ title: string; enrollments: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("courses").select("title, enrollments(id)").limit(5);
      if (data) {
        const mapped = data.map((c: any) => ({
          title: c.title,
          enrollments: Array.isArray(c.enrollments) ? c.enrollments.length : 0,
        })).sort((a, b) => b.enrollments - a.enrollments);
        setCourses(mapped);
      }
    };
    load();
  }, []);

  const max = Math.max(...courses.map(c => c.enrollments), 1);

  return (
    <div className="space-y-4">
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses created yet.</p>
      ) : courses.map((c) => (
        <div key={c.title}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground truncate mr-2">{c.title}</span>
            <span className="font-medium text-foreground">{c.enrollments} enrolled</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${(c.enrollments / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Instructor Dashboard
function InstructorDashboard() {
  const { user } = useAuth();
  const [courseCount, setCourseCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [avgCompletion, setAvgCompletion] = useState(0);
  const [quizCount, setQuizCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get instructor's courses
      const { data: courses } = await supabase.from("courses").select("id").eq("created_by", user.id);
      const courseIds = (courses || []).map((c: any) => c.id);
      setCourseCount(courseIds.length);

      if (courseIds.length > 0) {
        // Get enrollments for those courses
        const { data: enrollments } = await supabase.from("enrollments").select("user_id, progress").in("course_id", courseIds);
        const uniqueStudents = new Set((enrollments || []).map((e: any) => e.user_id));
        setStudentCount(uniqueStudents.size);
        const progresses = (enrollments || []).map((e: any) => Number(e.progress) || 0);
        setAvgCompletion(progresses.length > 0 ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0);

        // Quiz count
        const { count } = await supabase.from("quizzes").select("id", { count: "exact", head: true }).in("course_id", courseIds);
        setQuizCount(count || 0);
      }
    };
    load();
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Instructor Dashboard</h1>
      <p className="text-muted-foreground mb-6">Manage your courses and students</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="My Courses" value={courseCount} />
        <StatCard icon={Users} label="Total Students" value={studentCount} />
        <StatCard icon={Target} label="Avg. Completion" value={`${avgCompletion}%`} />
        <StatCard icon={Trophy} label="Quizzes Created" value={quizCount} />
      </div>
      <div className="bg-card rounded-2xl p-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: BookOpen, label: "Create Course", desc: "Build a new course" },
            { icon: Trophy, label: "Create Quiz", desc: "Add an assessment" },
            { icon: BarChart3, label: "View Analytics", desc: "Check student stats" },
          ].map((a) => (
            <button key={a.label} className="p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left group">
              <a.icon className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-sm text-foreground">{a.label}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Student Dashboard
function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [eRes, pRes] = await Promise.all([
        supabase.from("enrollments").select("*, courses(title, category, difficulty, thumbnail_url)").eq("user_id", user.id),
        supabase.from("user_points").select("points, streak_days").eq("user_id", user.id).maybeSingle(),
      ]);
      setEnrollments(eRes.data || []);
      setPoints(pRes.data?.points || 0);
      setStreak(pRes.data?.streak_days || 0);
    };
    load();
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Student Dashboard</h1>
      <p className="text-muted-foreground mb-6">Continue your learning journey</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Enrolled Courses" value={enrollments.length} />
        <StatCard icon={Award} label="Points Earned" value={points} />
        <StatCard icon={Flame} label="Day Streak" value={streak} />
        <StatCard icon={Target} label="Completed" value={enrollments.filter((e: any) => e.completed_at).length} />
      </div>

      {enrollments.length > 0 ? (
        <div>
          <h3 className="font-display font-semibold text-foreground mb-4">My Courses</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map((e: any) => (
              <div key={e.id} className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all group">
                <div className="h-32 gradient-primary opacity-80" />
                <div className="p-4">
                  <span className="text-xs font-medium text-primary">{e.courses?.category}</span>
                  <h4 className="font-display font-semibold text-foreground mt-1">{e.courses?.title}</h4>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">{Math.round(Number(e.progress) || 0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${e.progress || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No Courses Yet</h3>
          <p className="text-muted-foreground mb-4">Browse available courses and start learning!</p>
        </div>
      )}
    </div>
  );
}

// Parent Dashboard
function ParentDashboard() {
  const { user } = useAuth();
  const [childData, setChildData] = useState<{ name: string; courses: number; quizAvg: number; studyTime: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get linked children
      const { data: links } = await supabase.from("parent_child_links").select("child_id").eq("parent_id", user.id);
      if (!links || links.length === 0) return;

      const childIds = links.map((l: any) => l.child_id);
      const results: typeof childData = [];

      for (const childId of childIds) {
        const [profile, enrollments, attempts, lessonProg] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("user_id", childId).maybeSingle(),
          supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", childId),
          supabase.from("quiz_attempts").select("score, max_score").eq("user_id", childId).not("completed_at", "is", null),
          supabase.from("lesson_progress").select("time_spent_seconds").eq("user_id", childId),
        ]);
        const scores = (attempts.data || []).map((a: any) => (Number(a.score) || 0) / Math.max(Number(a.max_score) || 1, 1));
        const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0;
        const totalTime = (lessonProg.data || []).reduce((sum: number, lp: any) => sum + (lp.time_spent_seconds || 0), 0);

        results.push({
          name: profile.data?.full_name || "Child",
          courses: enrollments.count || 0,
          quizAvg: avgScore,
          studyTime: Math.round(totalTime / 3600),
        });
      }
      setChildData(results);
    };
    load();
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Parent Dashboard</h1>
      <p className="text-muted-foreground mb-6">Monitor your child's learning progress</p>

      {childData.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No Linked Children</h3>
          <p className="text-muted-foreground">Link your child's account to view their progress.</p>
        </div>
      ) : childData.map((child, idx) => (
        <div key={idx} className="mb-8">
          <h3 className="font-display font-semibold text-foreground mb-4">{child.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={BookOpen} label="Enrolled Courses" value={child.courses} />
            <StatCard icon={BarChart3} label="Quiz Average" value={`${child.quizAvg}%`} />
            <StatCard icon={Clock} label="Study Time" value={`${child.studyTime}h`} />
            <StatCard icon={Trophy} label="Quizzes Taken" value={child.quizAvg > 0 ? "Active" : "None"} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { role } = useAuth();

  switch (role) {
    case "admin": return <AdminDashboard />;
    case "instructor": return <InstructorDashboard />;
    case "parent": return <ParentDashboard />;
    default: return <StudentDashboard />;
  }
}
