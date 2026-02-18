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
  const [stats, setStats] = useState({ users: 0, courses: 0, enrollments: 0 });

  useEffect(() => {
    const load = async () => {
      const [u, c, e] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
      ]);
      setStats({ users: u.count || 0, courses: c.count || 0, enrollments: e.count || 0 });
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-6">Platform overview and management</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Users" value={stats.users} trend="+12%" />
        <StatCard icon={BookOpen} label="Total Courses" value={stats.courses} trend="+5%" />
        <StatCard icon={GraduationCap} label="Enrollments" value={stats.enrollments} trend="+18%" />
        <StatCard icon={BarChart3} label="Completion Rate" value="78%" trend="+3%" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {["New student registered", "Course 'Python Basics' published", "Quiz completed by 15 students", "New instructor onboarded"].map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-foreground">{a}</span>
                <span className="text-xs text-muted-foreground ml-auto">{i + 1}h ago</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Platform Health</h3>
          <div className="space-y-4">
            {[
              { label: "Server Uptime", value: "99.9%", pct: 99.9 },
              { label: "API Response Time", value: "45ms", pct: 95 },
              { label: "Storage Used", value: "2.4 GB", pct: 24 },
              { label: "Active Sessions", value: "342", pct: 68 },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="font-medium text-foreground">{m.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Instructor Dashboard
function InstructorDashboard() {
  const { user } = useAuth();
  const [courseCount, setCourseCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("created_by", user.id).then(r => setCourseCount(r.count || 0));
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Instructor Dashboard</h1>
      <p className="text-muted-foreground mb-6">Manage your courses and students</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="My Courses" value={courseCount} trend="+2" />
        <StatCard icon={Users} label="Total Students" value="124" trend="+8%" />
        <StatCard icon={Target} label="Avg. Completion" value="72%" trend="+5%" />
        <StatCard icon={TrendingUp} label="Engagement" value="89%" trend="+3%" />
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
        <StatCard icon={Award} label="Points Earned" value={points} trend="+50" />
        <StatCard icon={Flame} label="Day Streak" value={streak} />
        <StatCard icon={Target} label="Mastery Level" value="Intermediate" />
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
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Parent Dashboard</h1>
      <p className="text-muted-foreground mb-6">Monitor your child's learning progress</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Enrolled Courses" value={3} />
        <StatCard icon={BarChart3} label="Overall Grade" value="B+" trend="+5%" />
        <StatCard icon={Clock} label="Study Time" value="12h" />
        <StatCard icon={Trophy} label="Achievements" value={7} />
      </div>
      <div className="bg-card rounded-2xl p-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Child's Recent Activity</h3>
        <div className="space-y-3">
          {["Completed 'Data Structures' Module 3", "Scored 92% on Python Quiz", "Enrolled in 'Machine Learning Basics'", "Earned 'Quick Learner' badge"].map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-sm text-foreground">{a}</span>
              <span className="text-xs text-muted-foreground ml-auto">{i === 0 ? "Today" : `${i}d ago`}</span>
            </div>
          ))}
        </div>
      </div>
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
