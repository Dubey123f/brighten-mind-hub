import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle, Clock, Shield, CheckCircle, ChevronLeft, ChevronRight, Send,
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  sort_order: number;
}

export default function ExamPlayer() {
  const { examId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [aiFlags, setAiFlags] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [grading, setGrading] = useState(false);

  const tabSwitchRef = useRef(0);
  const submitRef = useRef(false);

  // Load exam and questions
  useEffect(() => {
    if (!examId || !user) return;
    const load = async () => {
      const { data: examData } = await supabase.from("online_exams").select("*, courses(title)").eq("id", examId).single();
      if (!examData) { toast.error("Exam not found"); navigate("/dashboard/online-exams"); return; }
      setExam(examData);

      // Check if already attempted
      const { data: existing } = await supabase.from("exam_attempts").select("*").eq("exam_id", examId).eq("user_id", user.id).eq("is_submitted", true).maybeSingle();
      if (existing) { 
        setSubmitted(true); setScore(existing.score as number); setMaxScore(existing.max_score as number);
        setLoading(false); return;
      }

      const { data: qs } = await supabase.from("exam_questions").select("*").eq("exam_id", examId).order("sort_order");
      const parsed = (qs || []).map((q: any) => ({
        ...q,
        options: q.options ? (typeof q.options === "string" ? JSON.parse(q.options) : q.options) : null,
        points: Number(q.points),
      }));
      setQuestions(parsed);
      setTimeLeft((examData as any).duration_minutes * 60);

      // Create or resume attempt
      const { data: resumeAttempt } = await supabase.from("exam_attempts").select("*").eq("exam_id", examId).eq("user_id", user.id).eq("is_submitted", false).maybeSingle();
      if (resumeAttempt) {
        setAttemptId(resumeAttempt.id);
        if (resumeAttempt.answers) setAnswers(resumeAttempt.answers as any);
        setTabSwitches(resumeAttempt.tab_switches as number || 0);
        tabSwitchRef.current = resumeAttempt.tab_switches as number || 0;
      } else {
        const { data: newAttempt } = await supabase.from("exam_attempts").insert({
          exam_id: examId, user_id: user.id,
        } as any).select().single();
        if (newAttempt) setAttemptId(newAttempt.id);
      }
      setLoading(false);
    };
    load();
  }, [examId, user]);

  // Timer
  useEffect(() => {
    if (submitted || loading || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, loading]);

  // Tab switch detection
  useEffect(() => {
    if (submitted || loading) return;
    const handleVisibility = () => {
      if (document.hidden) {
        tabSwitchRef.current += 1;
        setTabSwitches(tabSwitchRef.current);
        setAiFlags(f => [...f, `Tab switch #${tabSwitchRef.current} at ${new Date().toISOString()}`]);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 4000);

        if (tabSwitchRef.current >= 3) {
          toast.error("Too many tab switches! Exam auto-submitted.");
          handleSubmit();
        } else {
          toast.warning(`⚠️ Tab switch detected (${tabSwitchRef.current}/3)! Exam will auto-submit at 3.`);
        }
        // Save flag to db
        if (attemptId) {
          supabase.from("exam_attempts").update({
            tab_switches: tabSwitchRef.current,
            ai_flags: [...aiFlags, `Tab switch #${tabSwitchRef.current}`],
          } as any).eq("id", attemptId).then(() => {});
        }
      }
    };

    // Disable copy/paste/right-click
    const preventCopy = (e: Event) => { e.preventDefault(); toast.warning("Copy/paste disabled during exam"); };
    const preventContext = (e: Event) => { e.preventDefault(); };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("copy", preventCopy);
    document.addEventListener("paste", preventCopy);
    document.addEventListener("cut", preventCopy);
    document.addEventListener("contextmenu", preventContext);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("paste", preventCopy);
      document.removeEventListener("cut", preventCopy);
      document.removeEventListener("contextmenu", preventContext);
    };
  }, [submitted, loading, attemptId, aiFlags]);

  // Auto-save answers periodically
  useEffect(() => {
    if (!attemptId || submitted) return;
    const interval = setInterval(() => {
      supabase.from("exam_attempts").update({ answers } as any).eq("id", attemptId).then(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [answers, attemptId, submitted]);

  const handleSubmit = useCallback(async () => {
    if (submitRef.current) return;
    submitRef.current = true;
    setGrading(true);

    // Auto-grade MCQs
    let autoScore = 0;
    let totalPoints = 0;
    const nonMcqQuestions: { id: string; question_text: string; correct_answer: string | null; student_answer: string; points: number }[] = [];

    questions.forEach(q => {
      totalPoints += q.points;
      const studentAns = answers[q.id] || "";
      if (q.question_type === "mcq") {
        if (studentAns === q.correct_answer) autoScore += q.points;
      } else {
        if (studentAns && q.correct_answer) {
          nonMcqQuestions.push({ id: q.id, question_text: q.question_text, correct_answer: q.correct_answer, student_answer: studentAns, points: q.points });
        }
      }
    });

    // AI grading for non-MCQ questions
    let aiScore = 0;
    if (nonMcqQuestions.length > 0) {
      try {
        const { data: gradeData, error: gradeError } = await supabase.functions.invoke("ai-grade-exam", {
          body: { questions: nonMcqQuestions },
        });
        if (!gradeError && gradeData?.results) {
          gradeData.results.forEach((r: any) => { aiScore += r.score || 0; });
        }
      } catch (err) {
        console.error("AI grading error:", err);
        // If AI fails, give 0 for subjective - teacher can review
      }
    }

    const finalScore = autoScore + aiScore;

    // Update attempt
    await supabase.from("exam_attempts").update({
      answers, score: finalScore, max_score: totalPoints,
      is_submitted: true, completed_at: new Date().toISOString(),
      tab_switches: tabSwitchRef.current,
      ai_flags: [...aiFlags, ...nonMcqQuestions.length > 0 ? ["AI grading applied"] : []],
    } as any).eq("id", attemptId);

    // Auto-upload marks to marks table
    if (exam) {
      const examName = (exam as any).exam_type === "mid_sem" ? "Mid Semester" : "End Semester";
      // Check if marks already exist
      const { data: existingMark } = await supabase.from("marks").select("id")
        .eq("course_id", (exam as any).course_id).eq("student_id", user!.id).eq("exam_name", examName).maybeSingle();

      if (existingMark) {
        await supabase.from("marks").update({
          marks_obtained: finalScore, max_marks: totalPoints,
        }).eq("id", existingMark.id);
      } else {
        await supabase.from("marks").insert({
          course_id: (exam as any).course_id, student_id: user!.id,
          exam_name: examName, marks_obtained: finalScore, max_marks: totalPoints,
          entered_by: user!.id,
        });
      }
    }

    setScore(finalScore);
    setMaxScore(totalPoints);
    setSubmitted(true);
    setGrading(false);
    toast.success("Exam submitted successfully!");
  }, [questions, answers, attemptId, aiFlags, exam, user]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (grading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-foreground font-medium">AI is grading your answers...</p>
        <p className="text-sm text-muted-foreground">Please wait, this may take a moment</p>
      </div>
    );
  }

  if (submitted) {
    const pct = maxScore ? Math.round(((score || 0) / maxScore) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Exam Submitted!</h1>
        <p className="text-muted-foreground mb-6">Your answers have been graded automatically</p>
        <div className="bg-card rounded-2xl p-6 shadow-card mb-6">
          <p className="text-4xl font-bold text-primary mb-1">{score}/{maxScore}</p>
          <p className="text-muted-foreground">Score: {pct}%</p>
          <div className="w-full bg-muted rounded-full h-3 mt-3">
            <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          {tabSwitches > 0 && (
            <p className="text-xs text-orange-500 mt-3 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {tabSwitches} tab switch(es) detected
            </p>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">Marks have been automatically uploaded to your records</p>
        <Button onClick={() => navigate("/dashboard/online-exams")}>Back to Exams</Button>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Warning overlay */}
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-red-500/20 flex items-center justify-center pointer-events-none">
          <div className="bg-destructive text-destructive-foreground px-8 py-4 rounded-2xl text-lg font-bold animate-pulse">
            ⚠️ Tab Switch Detected! ({tabSwitchRef.current}/3)
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card rounded-2xl p-4 shadow-card mb-4 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h2 className="font-semibold text-foreground text-sm">{exam?.title}</h2>
          <p className="text-xs text-muted-foreground">{(exam as any)?.courses?.title}</p>
        </div>
        <div className="flex items-center gap-4">
          {exam?.ai_proctoring && (
            <span className="text-xs text-orange-500 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Proctored</span>
          )}
          {tabSwitches > 0 && (
            <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {tabSwitches}/3</span>
          )}
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${timeLeft < 300 ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-primary/10 text-primary"}`}>
            <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrentQ(i)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
              i === currentQ ? "bg-primary text-primary-foreground" :
              answers[questions[i].id] ? "bg-green-500/20 text-green-600" :
              "bg-muted text-muted-foreground"
            }`}>{i + 1}</button>
        ))}
      </div>

      {/* Question */}
      {q && (
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
              {q.question_type.toUpperCase()} • {q.points} pts
            </span>
            <span className="text-xs text-muted-foreground">Q{currentQ + 1} of {questions.length}</span>
          </div>

          <p className="text-foreground font-medium mb-6">{q.question_text}</p>

          {q.question_type === "mcq" && q.options ? (
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    answers[q.id] === opt
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/50 text-foreground"
                  }`}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium mr-3">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <Textarea
              value={answers[q.id] || ""}
              onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
              placeholder={q.question_type === "short" ? "Type your short answer..." : "Write your detailed answer..."}
              rows={q.question_type === "long" ? 8 : 3}
              className="resize-none"
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(c => c - 1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            {currentQ === questions.length - 1 ? (
              <Button onClick={handleSubmit} variant="destructive" className="gap-1">
                <Send className="w-4 h-4" /> Submit Exam
              </Button>
            ) : (
              <Button onClick={() => setCurrentQ(c => c + 1)} className="gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
