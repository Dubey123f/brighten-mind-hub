import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Plus, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function QuizzesPage() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [newQuiz, setNewQuiz] = useState({ title: "", description: "", course_id: "", time_limit_minutes: 15 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let q = supabase.from("quizzes").select("*, courses(title)").order("created_at", { ascending: false });
      if (role === "instructor" && user) q = q.eq("created_by", user.id);
      const { data } = await q;
      setQuizzes(data || []);

      if (role === "instructor" && user) {
        const { data: c } = await supabase.from("courses").select("id, title").eq("created_by", user.id);
        setCourses(c || []);
      }
      setLoading(false);
    };
    load();
  }, [role, user]);

  const handleCreate = async () => {
    if (!user || !newQuiz.title.trim() || !newQuiz.course_id) return;
    const { error } = await supabase.from("quizzes").insert({
      ...newQuiz,
      time_limit_minutes: newQuiz.time_limit_minutes || null,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Quiz created!");
    setShowCreate(false);
    setNewQuiz({ title: "", description: "", course_id: "", time_limit_minutes: 15 });
    // reload
    const { data } = await supabase.from("quizzes").select("*, courses(title)").eq("created_by", user.id).order("created_at", { ascending: false });
    setQuizzes(data || []);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Quizzes</h1>
          <p className="text-muted-foreground text-sm">{role === "instructor" ? "Create and manage assessments" : "Take quizzes to test your knowledge"}</p>
        </div>
        {(role === "instructor" || role === "admin") && (
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> New Quiz
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-card-hover animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-foreground mb-4">Create Quiz</h3>
            <div className="space-y-3">
              <input value={newQuiz.title} onChange={e => setNewQuiz(p => ({ ...p, title: e.target.value }))} placeholder="Quiz title" className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground" />
              <textarea value={newQuiz.description} onChange={e => setNewQuiz(p => ({ ...p, description: e.target.value }))} placeholder="Description" rows={2} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground resize-none" />
              <select value={newQuiz.course_id} onChange={e => setNewQuiz(p => ({ ...p, course_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground">
                <option value="">Select course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <input type="number" value={newQuiz.time_limit_minutes} onChange={e => setNewQuiz(p => ({ ...p, time_limit_minutes: parseInt(e.target.value) || 0 }))} placeholder="Time limit (minutes)" className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground" />
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleCreate} className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-2xl animate-pulse shadow-card" />)}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No Quizzes Yet</h3>
          <p className="text-muted-foreground">{role === "instructor" ? "Create your first quiz!" : "No quizzes available yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map(q => (
            <div key={q.id} className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-display font-semibold text-foreground">{q.title}</h4>
                <p className="text-xs text-muted-foreground">{(q.courses as any)?.title || "No course"} • {q.time_limit_minutes ? `${q.time_limit_minutes} min` : "No time limit"}</p>
              </div>
              {role === "student" && (
                <button
                  onClick={() => navigate(`/dashboard/quizzes/${q.id}`)}
                  className="px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  Start Quiz
                </button>
              )}
              {(role === "instructor" || role === "admin") && (
                <button
                  onClick={() => navigate(`/dashboard/quizzes/${q.id}/manage`)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
                >
                  Manage
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
