import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle, XCircle, ChevronRight, Trophy } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  sort_order: number;
}

export default function QuizPlayer() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId || !user) return;
    const load = async () => {
      setLoading(true);
      const [qRes, questRes] = await Promise.all([
        supabase.from("quizzes").select("*, courses(title)").eq("id", quizId).single(),
        supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order"),
      ]);
      if (!qRes.data || !questRes.data?.length) {
        toast.error("Quiz not found or has no questions");
        navigate("/dashboard/quizzes");
        return;
      }
      setQuiz(qRes.data);
      const parsed = questRes.data.map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : (q.options ? JSON.parse(q.options) : null),
        points: q.points || 1,
      }));
      setQuestions(parsed);
      if (qRes.data.time_limit_minutes) {
        setTimeLeft(qRes.data.time_limit_minutes * 60);
      }
      // Create attempt
      const { data: attempt } = await supabase.from("quiz_attempts").insert({
        quiz_id: quizId,
        user_id: user.id,
      }).select("id").single();
      if (attempt) setAttemptId(attempt.id);
      setLoading(false);
    };
    load();
  }, [quizId, user]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const handleSubmit = async () => {
    if (submitted) return;
    let earned = 0;
    let total = 0;
    questions.forEach(q => {
      total += q.points;
      if (answers[q.id] && q.correct_answer && answers[q.id] === q.correct_answer) {
        earned += q.points;
      }
    });
    setScore(earned);
    setMaxScore(total);
    setSubmitted(true);

    if (attemptId) {
      await supabase.from("quiz_attempts").update({
        answers: answers as any,
        score: earned,
        max_score: total,
        completed_at: new Date().toISOString(),
      }).eq("id", attemptId);
    }
    toast.success("Quiz submitted!");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (submitted) {
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl p-8 shadow-card text-center">
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${pct >= 70 ? "text-warning" : "text-muted-foreground"}`} />
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Quiz Complete!</h2>
          <p className="text-muted-foreground mb-4">{quiz?.title}</p>
          <div className="text-4xl font-bold text-foreground mb-2">{score}/{maxScore}</div>
          <div className="text-sm text-muted-foreground mb-6">{pct}% correct</div>
          <div className="h-3 rounded-full bg-muted overflow-hidden mb-8 max-w-xs mx-auto">
            <div className={`h-full rounded-full transition-all duration-700 ${pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
          </div>

          {/* Review answers */}
          <div className="text-left space-y-4 mb-6">
            {questions.map((q, i) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correct_answer;
              return (
                <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="flex items-start gap-2">
                    {isCorrect ? <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">Q{i + 1}: {q.question_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">Your answer: {userAns || "Not answered"}</p>
                      {!isCorrect && <p className="text-xs text-success mt-0.5">Correct: {q.correct_answer}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => navigate("/dashboard/quizzes")} className="px-6 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/dashboard/quizzes")} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h2 className="font-display font-bold text-foreground">{quiz?.title}</h2>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${timeLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"} text-sm font-medium`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
              i === currentQ
                ? "gradient-primary text-primary-foreground"
                : answers[questions[i].id]
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      <div className="bg-card rounded-2xl p-6 shadow-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-primary">Question {currentQ + 1} of {questions.length}</span>
          <span className="text-xs text-muted-foreground">{q.points} point{q.points > 1 ? "s" : ""}</span>
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground mb-6">{q.question_text}</h3>

        {q.options && q.options.length > 0 ? (
          <div className="space-y-3">
            {q.options.map((opt: string, oi: number) => (
              <button
                key={oi}
                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                  answers[q.id] === opt
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border hover:border-primary/50 text-foreground"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                    answers[q.id] === opt ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                  }`}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={answers[q.id] || ""}
            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
          disabled={currentQ === 0}
          className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          Previous
        </button>

        {currentQ < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ(prev => prev + 1)}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}
