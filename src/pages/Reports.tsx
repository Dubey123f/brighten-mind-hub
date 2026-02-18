import { FileText, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv-export";
import { toast } from "sonner";

export default function Reports() {
  const { user } = useAuth();

  const exportProgress = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("enrollments")
      .select("progress, enrolled_at, completed_at, courses(title)")
      .eq("user_id", user.id);
    if (!data || data.length === 0) { toast.info("No data to export"); return; }
    exportToCSV(data.map((d: any) => ({
      course: (d.courses as any)?.title || "N/A",
      progress: `${Math.round(Number(d.progress) || 0)}%`,
      enrolled: new Date(d.enrolled_at).toLocaleDateString(),
      completed: d.completed_at ? new Date(d.completed_at).toLocaleDateString() : "In Progress",
    })), "progress_report");
    toast.success("Report downloaded!");
  };

  const exportQuizResults = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("quiz_attempts")
      .select("score, max_score, started_at, completed_at, quizzes(title)")
      .eq("user_id", user.id)
      .not("completed_at", "is", null);
    if (!data || data.length === 0) { toast.info("No quiz data to export"); return; }
    exportToCSV(data.map((d: any) => ({
      quiz: (d.quizzes as any)?.title || "N/A",
      score: d.score,
      max_score: d.max_score,
      percentage: `${Math.round((Number(d.score) / Math.max(Number(d.max_score), 1)) * 100)}%`,
      date: new Date(d.completed_at).toLocaleDateString(),
    })), "quiz_results");
    toast.success("Report downloaded!");
  };

  const reports = [
    { title: "Course Progress Report", desc: "Your enrollment progress across all courses", action: exportProgress },
    { title: "Quiz Performance Report", desc: "All quiz scores and results", action: exportQuizResults },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Reports</h1>
      <p className="text-muted-foreground mb-6">Download your progress reports as CSV</p>

      <div className="bg-card rounded-2xl p-6 shadow-card">
        <div className="space-y-3">
          {reports.map((r, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <FileText className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <button onClick={r.action} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
