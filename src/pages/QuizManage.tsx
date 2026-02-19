import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";

export default function QuizManage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState({
    question_text: "",
    question_type: "mcq",
    options: ["", "", "", ""],
    correct_answer: "",
    points: 1,
  });

  useEffect(() => {
    if (!quizId) return;
    load();
  }, [quizId]);

  const load = async () => {
    setLoading(true);
    const [qRes, questRes] = await Promise.all([
      supabase.from("quizzes").select("*, courses(title)").eq("id", quizId!).single(),
      supabase.from("quiz_questions").select("*").eq("quiz_id", quizId!).order("sort_order"),
    ]);
    setQuiz(qRes.data);
    setQuestions((questRes.data || []).map((q: any) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : (q.options ? JSON.parse(q.options) : []),
    })));
    setLoading(false);
  };

  const handleAddQuestion = async () => {
    if (!newQ.question_text.trim() || !newQ.correct_answer.trim()) {
      toast.error("Fill in question and correct answer");
      return;
    }
    const filteredOptions = newQ.options.filter(o => o.trim());
    const { error } = await supabase.from("quiz_questions").insert({
      quiz_id: quizId!,
      question_text: newQ.question_text,
      question_type: newQ.question_type,
      options: filteredOptions.length > 0 ? filteredOptions : null,
      correct_answer: newQ.correct_answer,
      points: newQ.points,
      sort_order: questions.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Question added!");
    setNewQ({ question_text: "", question_type: "mcq", options: ["", "", "", ""], correct_answer: "", points: 1 });
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Question deleted");
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate("/dashboard/quizzes")} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">{quiz?.title}</h1>
          <p className="text-sm text-muted-foreground">{(quiz?.courses as any)?.title} • {questions.length} questions</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {/* Add question form */}
      {showAdd && (
        <div className="bg-card rounded-2xl p-6 shadow-card mb-6 animate-fade-in">
          <h3 className="font-display font-bold text-foreground mb-4">New Question</h3>
          <div className="space-y-3">
            <textarea
              value={newQ.question_text}
              onChange={e => setNewQ(p => ({ ...p, question_text: e.target.value }))}
              placeholder="Question text..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              {newQ.options.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={e => {
                    const updated = [...newQ.options];
                    updated[i] = e.target.value;
                    setNewQ(p => ({ ...p, options: updated }));
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newQ.correct_answer}
                onChange={e => setNewQ(p => ({ ...p, correct_answer: e.target.value }))}
                placeholder="Correct answer (must match an option exactly)"
                className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
              />
              <input
                type="number"
                value={newQ.points}
                onChange={e => setNewQ(p => ({ ...p, points: parseInt(e.target.value) || 1 }))}
                placeholder="Points"
                min={1}
                className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleAddQuestion} className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add Question</button>
            </div>
          </div>
        </div>
      )}

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card">
          <p className="text-muted-foreground">No questions yet. Add your first question!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-card rounded-2xl p-5 shadow-card">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{q.question_text}</p>
                  {q.options && q.options.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt: string, oi: number) => (
                        <div key={oi} className={`text-xs px-3 py-1.5 rounded-lg ${opt === q.correct_answer ? "bg-success/10 text-success font-medium" : "bg-muted text-muted-foreground"}`}>
                          {String.fromCharCode(65 + oi)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{q.points} point{q.points > 1 ? "s" : ""} • Correct: {q.correct_answer}</p>
                </div>
                <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
