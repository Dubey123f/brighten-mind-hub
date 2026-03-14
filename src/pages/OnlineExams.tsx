import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Plus, Clock, Shield, Play, Eye, Trash2, Edit,
  AlertTriangle, CheckCircle, Users, Award,
} from "lucide-react";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  exam_type: string;
  duration_minutes: number;
  max_marks: number;
  start_time: string | null;
  end_time: string | null;
  created_by: string;
  is_active: boolean;
  ai_proctoring: boolean;
  created_at: string;
  courses?: { title: string } | null;
}

interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  sort_order: number;
}

export default function OnlineExams() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isTeacher = role === "instructor" || role === "admin";

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQ, setNewQ] = useState({ question_text: "", question_type: "mcq", options: ["", "", "", ""], correct_answer: "", points: 1 });
  const [attempts, setAttempts] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: "", description: "", course_id: "", exam_type: "mid_sem",
    duration_minutes: 60, max_marks: 100, start_time: "", end_time: "",
    is_active: false, ai_proctoring: true,
  });

  const loadExams = async () => {
    setLoading(true);
    const q = supabase.from("online_exams").select("*, courses(title)").order("created_at", { ascending: false });
    if (!isTeacher) {
      // Students only see active exams
    }
    const { data } = await q;
    setExams((data as any) || []);
    setLoading(false);
  };

  const loadCourses = async () => {
    const { data } = await supabase.from("courses").select("id, title");
    setCourses(data || []);
  };

  useEffect(() => {
    loadExams();
    if (isTeacher) loadCourses();
    // Load student's attempts
    if (!isTeacher && user) {
      supabase.from("exam_attempts").select("*").eq("user_id", user.id).then(({ data }) => setAttempts(data || []));
    }
  }, [role, user]);

  const createExam = async () => {
    if (!form.title || !form.course_id) { toast.error("Title and course required"); return; }
    const { error } = await supabase.from("online_exams").insert({
      ...form,
      duration_minutes: Number(form.duration_minutes),
      max_marks: Number(form.max_marks),
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      created_by: user!.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Exam created!");
    setShowCreate(false);
    setForm({ title: "", description: "", course_id: "", exam_type: "mid_sem", duration_minutes: 60, max_marks: 100, start_time: "", end_time: "", is_active: false, ai_proctoring: true });
    loadExams();
  };

  const toggleActive = async (exam: Exam) => {
    await supabase.from("online_exams").update({ is_active: !exam.is_active } as any).eq("id", exam.id);
    loadExams();
  };

  const deleteExam = async (id: string) => {
    await supabase.from("online_exams").delete().eq("id", id);
    toast.success("Exam deleted");
    loadExams();
  };

  const openManage = async (examId: string) => {
    setShowManage(examId);
    const { data } = await supabase.from("exam_questions").select("*").eq("exam_id", examId).order("sort_order");
    setQuestions((data as any) || []);
  };

  const addQuestion = async () => {
    if (!newQ.question_text) { toast.error("Question text required"); return; }
    const opts = newQ.question_type === "mcq" ? newQ.options.filter(o => o.trim()) : null;
    const { error } = await supabase.from("exam_questions").insert({
      exam_id: showManage!,
      question_text: newQ.question_text,
      question_type: newQ.question_type,
      options: opts ? JSON.stringify(opts) : null,
      correct_answer: newQ.correct_answer || null,
      points: Number(newQ.points),
      sort_order: questions.length,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Question added");
    setNewQ({ question_text: "", question_type: "mcq", options: ["", "", "", ""], correct_answer: "", points: 1 });
    openManage(showManage!);
  };

  const deleteQuestion = async (qId: string) => {
    await supabase.from("exam_questions").delete().eq("id", qId);
    openManage(showManage!);
  };

  const canStartExam = (exam: Exam) => {
    if (!exam.is_active) return false;
    const now = new Date();
    if (exam.start_time && new Date(exam.start_time) > now) return false;
    if (exam.end_time && new Date(exam.end_time) < now) return false;
    // Check if already submitted
    return !attempts.find(a => a.exam_id === exam.id && a.is_submitted);
  };

  const getExamStatus = (exam: Exam) => {
    const attempt = attempts.find(a => a.exam_id === exam.id);
    if (attempt?.is_submitted) return "completed";
    if (!exam.is_active) return "inactive";
    const now = new Date();
    if (exam.start_time && new Date(exam.start_time) > now) return "upcoming";
    if (exam.end_time && new Date(exam.end_time) < now) return "expired";
    return "live";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Online Exams</h1>
          <p className="text-muted-foreground">{isTeacher ? "Create and manage proctored online exams" : "Take your scheduled exams"}</p>
        </div>
        {isTeacher && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create Exam
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No exams yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map(exam => {
            const status = isTeacher ? (exam.is_active ? "live" : "inactive") : getExamStatus(exam);
            return (
              <div key={exam.id} className="bg-card rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        status === "live" ? "bg-green-500/10 text-green-500" :
                        status === "completed" ? "bg-blue-500/10 text-blue-500" :
                        status === "upcoming" ? "bg-yellow-500/10 text-yellow-500" :
                        status === "expired" ? "bg-red-500/10 text-red-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {status === "live" ? "🟢 Live" : status === "completed" ? "✅ Completed" : status === "upcoming" ? "🕐 Upcoming" : status === "expired" ? "❌ Expired" : "⏸️ Inactive"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${exam.exam_type === "mid_sem" ? "bg-primary/10 text-primary" : "bg-purple-500/10 text-purple-500"}`}>
                        {exam.exam_type === "mid_sem" ? "Mid Sem" : "End Sem"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground">{exam.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{(exam as any).courses?.title}</p>
                  </div>
                </div>

                {exam.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{exam.description}</p>}

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {exam.max_marks} marks</span>
                  {exam.ai_proctoring && <span className="flex items-center gap-1 text-orange-500"><Shield className="w-3 h-3" /> AI Proctored</span>}
                </div>

                {exam.start_time && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(exam.start_time).toLocaleString()} — {exam.end_time ? new Date(exam.end_time).toLocaleString() : "No end"}
                  </p>
                )}

                <div className="flex gap-2">
                  {isTeacher ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openManage(exam.id)} className="gap-1 flex-1">
                        <Edit className="w-3.5 h-3.5" /> Questions
                      </Button>
                      <Button size="sm" variant={exam.is_active ? "destructive" : "default"} onClick={() => toggleActive(exam)} className="gap-1">
                        {exam.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteExam(exam.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {status === "completed" ? (
                        <div className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Score: {attempts.find(a => a.exam_id === exam.id)?.score}/{attempts.find(a => a.exam_id === exam.id)?.max_score}</div>
                      ) : canStartExam(exam) ? (
                        <Button size="sm" onClick={() => navigate(`/dashboard/online-exams/${exam.id}`)} className="gap-1 w-full">
                          <Play className="w-3.5 h-3.5" /> Start Exam
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {status === "upcoming" ? "Not started yet" : status === "expired" ? "Exam window closed" : "Not available"}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Exam Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Online Exam</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Exam title" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" /></div>
            <div><Label>Course</Label>
              <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Exam Type</Label>
                <Select value={form.exam_type} onValueChange={v => setForm(f => ({ ...f, exam_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mid_sem">Mid Semester</SelectItem>
                    <SelectItem value="end_sem">End Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Max Marks</Label><Input type="number" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: Number(e.target.value) }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Time</Label><Input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div><Label>End Time</Label><Input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            <div className="flex items-center justify-between">
              <Label>AI Proctoring</Label>
              <Switch checked={form.ai_proctoring} onCheckedChange={v => setForm(f => ({ ...f, ai_proctoring: v }))} />
            </div>
            <Button onClick={createExam} className="w-full">Create Exam</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Questions Dialog */}
      <Dialog open={!!showManage} onOpenChange={() => setShowManage(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Questions</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-muted/50 rounded-xl p-4 relative">
                <button onClick={() => deleteQuestion(q.id)} className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 rounded p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <p className="text-sm font-medium text-foreground mb-1">Q{i + 1}. {q.question_text}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{q.question_type.toUpperCase()}</span>
                  <span>{q.points} pts</span>
                </div>
                {q.options && (
                  <div className="mt-2 space-y-1">
                    {(Array.isArray(q.options) ? q.options : JSON.parse(q.options as any)).map((opt: string, j: number) => (
                      <p key={j} className={`text-xs px-2 py-1 rounded ${opt === q.correct_answer ? "bg-green-500/10 text-green-600 font-medium" : "text-muted-foreground"}`}>
                        {String.fromCharCode(65 + j)}. {opt}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="font-medium text-sm text-foreground">Add Question</h4>
              <div><Label>Question Type</Label>
                <Select value={newQ.question_type} onValueChange={v => setNewQ(q => ({ ...q, question_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="short">Short Answer</SelectItem>
                    <SelectItem value="long">Long Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Question</Label><Textarea value={newQ.question_text} onChange={e => setNewQ(q => ({ ...q, question_text: e.target.value }))} /></div>
              {newQ.question_type === "mcq" && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {newQ.options.map((opt, i) => (
                    <Input key={i} value={opt} onChange={e => {
                      const opts = [...newQ.options];
                      opts[i] = e.target.value;
                      setNewQ(q => ({ ...q, options: opts }));
                    }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  ))}
                </div>
              )}
              <div><Label>Correct Answer</Label><Input value={newQ.correct_answer} onChange={e => setNewQ(q => ({ ...q, correct_answer: e.target.value }))} placeholder={newQ.question_type === "mcq" ? "Type the correct option text" : "Expected answer"} /></div>
              <div><Label>Points</Label><Input type="number" value={newQ.points} onChange={e => setNewQ(q => ({ ...q, points: Number(e.target.value) }))} /></div>
              <Button onClick={addQuestion} className="w-full">Add Question</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
