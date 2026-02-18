import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, BookOpen, Clock, Target, TrendingUp } from "lucide-react";

export default function Progress() {
  const { user, role } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [eRes, aRes] = await Promise.all([
        supabase.from("enrollments").select("*, courses(title, category)").eq("user_id", user.id),
        supabase.from("quiz_attempts").select("score, max_score, completed_at, quizzes(title)").eq("user_id", user.id).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(10),
      ]);
      setEnrollments(eRes.data || []);
      setAttempts(aRes.data || []);
    };
    load();
  }, [user]);

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (Number(a.score) / Math.max(Number(a.max_score), 1)) * 100, 0) / attempts.length)
    : 0;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">
        {role === "parent" ? "Child's Progress" : "My Progress"}
      </h1>
      <p className="text-muted-foreground mb-6">Track your learning journey</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{enrollments.length}</p>
              <p className="text-sm text-muted-foreground">Courses</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success flex items-center justify-center">
              <Target className="w-5 h-5 text-success-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{avgScore}%</p>
              <p className="text-sm text-muted-foreground">Avg Quiz Score</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{attempts.length}</p>
              <p className="text-sm text-muted-foreground">Quizzes Taken</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course progress */}
      <div className="bg-card rounded-2xl p-6 shadow-card mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Course Progress</h3>
        {enrollments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No courses enrolled yet.</p>
        ) : (
          <div className="space-y-4">
            {enrollments.map((e: any) => (
              <div key={e.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{e.courses?.title}</span>
                  <span className="text-muted-foreground">{Math.round(Number(e.progress) || 0)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${e.progress || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent quizzes */}
      <div className="bg-card rounded-2xl p-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Recent Quiz Results</h3>
        {attempts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No quizzes taken yet.</p>
        ) : (
          <div className="space-y-3">
            {attempts.map((a: any, i: number) => {
              const pct = Math.round((Number(a.score) / Math.max(Number(a.max_score), 1)) * 100);
              return (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${pct >= 70 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {pct}%
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{(a.quizzes as any)?.title || "Quiz"}</p>
                    <p className="text-xs text-muted-foreground">{a.score}/{a.max_score} points</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
