import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, BookOpen, TrendingUp, AlertTriangle, Download } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";
import { toast } from "sonner";

export default function Analytics() {
  const { role, user } = useAuth();
  const [stats, setStats] = useState({ totalStudents: 0, totalCourses: 0, avgCompletion: 0, totalEnrollments: 0 });
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [engagementData, setEngagementData] = useState<number[]>([]);
  const [monthlyEnrollments, setMonthlyEnrollments] = useState<number[]>(new Array(12).fill(0));

  useEffect(() => {
    const load = async () => {
      const [students, courses, enrollments] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("progress, enrolled_at"),
      ]);

      const enrollmentData = enrollments.data || [];
      const progresses = enrollmentData.map((e: any) => Number(e.progress) || 0);
      const avg = progresses.length > 0 ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;

      // Count at-risk students: those with progress < 25% who enrolled more than 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const atRisk = enrollmentData.filter((e: any) => {
        const progress = Number(e.progress) || 0;
        const enrolledAt = new Date(e.enrolled_at);
        return progress < 25 && enrolledAt < sevenDaysAgo;
      }).length;
      setAtRiskCount(atRisk);

      // Calculate monthly enrollment counts for the current year
      const currentYear = new Date().getFullYear();
      const monthly = new Array(12).fill(0);
      enrollmentData.forEach((e: any) => {
        const date = new Date(e.enrolled_at);
        if (date.getFullYear() === currentYear) {
          monthly[date.getMonth()]++;
        }
      });
      setMonthlyEnrollments(monthly);

      setStats({
        totalStudents: students.count || 0,
        totalCourses: courses.count || 0,
        avgCompletion: avg,
        totalEnrollments: progresses.length,
      });

      // Load real engagement data from lesson_progress (last 35 days)
      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
      const { data: lessonProgress } = await supabase
        .from("lesson_progress")
        .select("completed_at, time_spent_seconds")
        .gte("completed_at", thirtyFiveDaysAgo.toISOString());

      // Build engagement per day (last 35 days)
      const dailyEngagement = new Array(35).fill(0);
      let maxEngagement = 1;
      (lessonProgress || []).forEach((lp: any) => {
        if (lp.completed_at) {
          const daysAgo = Math.floor((Date.now() - new Date(lp.completed_at).getTime()) / (1000 * 60 * 60 * 24));
          const idx = 34 - daysAgo;
          if (idx >= 0 && idx < 35) {
            dailyEngagement[idx] += (lp.time_spent_seconds || 60);
          }
        }
      });
      maxEngagement = Math.max(...dailyEngagement, 1);
      setEngagementData(dailyEngagement.map(v => v / maxEngagement));
    };
    load();
  }, []);

  const handleExport = async () => {
    const { data } = await supabase.from("enrollments").select("user_id, course_id, progress, enrolled_at, completed_at, courses(title), profiles!enrollments_user_id_fkey(full_name)");
    if (!data || data.length === 0) { toast.info("No data to export"); return; }
    exportToCSV(data.map((d: any) => ({
      student: (d.profiles as any)?.full_name || "Unknown",
      course: (d.courses as any)?.title || "N/A",
      progress: `${Math.round(Number(d.progress) || 0)}%`,
      enrolled: d.enrolled_at,
      completed: d.completed_at || "In Progress",
    })), "analytics_report");
    toast.success("Report exported!");
  };

  const maxMonthly = Math.max(...monthlyEnrollments, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm">Platform performance insights</p>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <Users className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">{stats.totalStudents}</p>
          <p className="text-sm text-muted-foreground">Total Students</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <BookOpen className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">{stats.totalCourses}</p>
          <p className="text-sm text-muted-foreground">Total Courses</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <TrendingUp className="w-5 h-5 text-success mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">{stats.avgCompletion}%</p>
          <p className="text-sm text-muted-foreground">Avg Completion</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <AlertTriangle className="w-5 h-5 text-warning mb-2" />
          <p className="text-2xl font-display font-bold text-foreground">{atRiskCount}</p>
          <p className="text-sm text-muted-foreground">At-Risk Students</p>
        </div>
      </div>

      {/* Engagement heatmap from real lesson_progress data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Weekly Engagement</h3>
          <div className="grid grid-cols-7 gap-1">
            {(engagementData.length > 0 ? engagementData : new Array(35).fill(0)).map((intensity, i) => (
              <div
                key={i}
                className="aspect-square rounded-sm transition-all hover:scale-110"
                style={{
                  backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.8})`,
                }}
                title={`${Math.round(intensity * 100)}% engagement`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((v, i) => (
              <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `hsl(var(--primary) / ${v})` }} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Enrollment Trend ({new Date().getFullYear()})</h3>
          <div className="flex items-end gap-2 h-40">
            {monthlyEnrollments.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md gradient-primary transition-all hover:opacity-80"
                  style={{ height: `${maxMonthly > 0 ? (v / maxMonthly) * 100 : 0}%`, minHeight: v > 0 ? '4px' : '0px' }}
                />
                <span className="text-[10px] text-muted-foreground">{["J","F","M","A","M","J","J","A","S","O","N","D"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
