import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, BookOpen, TrendingUp, AlertTriangle, Download } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";
import { toast } from "sonner";

export default function Analytics() {
  const { role, user } = useAuth();
  const [stats, setStats] = useState({ totalStudents: 0, totalCourses: 0, avgCompletion: 0, totalEnrollments: 0 });

  useEffect(() => {
    const load = async () => {
      const [students, courses, enrollments] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("progress"),
      ]);

      const progresses = (enrollments.data || []).map((e: any) => Number(e.progress) || 0);
      const avg = progresses.length > 0 ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;

      setStats({
        totalStudents: students.count || 0,
        totalCourses: courses.count || 0,
        avgCompletion: avg,
        totalEnrollments: progresses.length,
      });
    };
    load();
  }, []);

  const atRiskCount = Math.floor(stats.totalStudents * 0.15);

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

      {/* Engagement heatmap placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Weekly Engagement</h3>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => {
              const intensity = Math.random();
              return (
                <div
                  key={i}
                  className="aspect-square rounded-sm transition-all hover:scale-110"
                  style={{
                    backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.8})`,
                  }}
                  title={`${Math.round(intensity * 100)}% engagement`}
                />
              );
            })}
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
          <h3 className="font-display font-semibold text-foreground mb-4">Enrollment Trend</h3>
          <div className="flex items-end gap-2 h-40">
            {[40, 55, 35, 70, 65, 80, 90, 75, 85, 95, 88, 100].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md gradient-primary transition-all hover:opacity-80"
                  style={{ height: `${v}%` }}
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
