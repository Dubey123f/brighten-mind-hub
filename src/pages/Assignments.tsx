import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Plus, Upload, CheckCircle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Assignments() {
  const { user, role } = useAuth();
  const isTeacher = role === "instructor" || role === "admin";

  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({ title: "", description: "", course_id: "", due_date: "", max_marks: "100" });
  const [submitContent, setSubmitContent] = useState("");
  const [gradeForm, setGradeForm] = useState({ marks: "", feedback: "", submissionId: "" });

  useEffect(() => {
    const load = async () => {
      if (isTeacher) {
        const { data } = await supabase.from("courses").select("id, title").order("title");
        setCourses(data || []);
      } else {
        const { data } = await supabase.from("enrollments").select("course_id, courses(id, title)").eq("user_id", user!.id);
        setCourses(data?.map((e: any) => e.courses).filter(Boolean) || []);
      }
    };
    if (user) load();
  }, [user, role]);

  const loadAssignments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assignments")
      .select("*, courses(title)")
      .order("created_at", { ascending: false });
    setAssignments(data || []);

    // Load student submissions
    if (!isTeacher && user) {
      const { data: subs } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("student_id", user.id);
      const map: Record<string, any> = {};
      (subs || []).forEach((s: any) => { map[s.assignment_id] = s; });
      setSubmissions(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) loadAssignments(); }, [user, role]);

  const createAssignment = async () => {
    if (!form.title || !form.course_id) { toast.error("Title and course required"); return; }
    const { error } = await supabase.from("assignments").insert({
      title: form.title,
      description: form.description || null,
      course_id: form.course_id,
      due_date: form.due_date || null,
      max_marks: Number(form.max_marks) || 100,
      created_by: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Assignment created!");
    setForm({ title: "", description: "", course_id: "", due_date: "", max_marks: "100" });
    setDialogOpen(false);
    loadAssignments();
  };

  const submitAssignment = async () => {
    if (!selectedAssignment || !submitContent.trim()) { toast.error("Please enter your answer"); return; }
    const { error } = await supabase.from("assignment_submissions").insert({
      assignment_id: selectedAssignment.id,
      student_id: user!.id,
      content: submitContent,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Assignment submitted!");
    setSubmitContent("");
    setSubmitDialogOpen(false);
    loadAssignments();
  };

  const loadSubmissions = async (assignmentId: string) => {
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*, profiles!assignment_submissions_student_id_fkey(full_name)")
      .eq("assignment_id", assignmentId);
    setSubmissionsList(data || []);
  };

  const gradeSubmission = async () => {
    if (!gradeForm.submissionId) return;
    const { error } = await supabase.from("assignment_submissions").update({
      marks_obtained: Number(gradeForm.marks),
      feedback: gradeForm.feedback,
      graded_at: new Date().toISOString(),
      graded_by: user!.id,
    }).eq("id", gradeForm.submissionId);
    if (error) { toast.error(error.message); return; }
    toast.success("Graded successfully!");
    setGradeForm({ marks: "", feedback: "", submissionId: "" });
    if (selectedAssignment) loadSubmissions(selectedAssignment.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Assignments</h1>
          <p className="text-muted-foreground">{isTeacher ? "Create and manage assignments" : "View and submit assignments"}</p>
        </div>
        {isTeacher && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Create Assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" />
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" />
                <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                  <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground" />
                  <input type="number" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: e.target.value }))} placeholder="Max Marks" className="px-3 py-2 rounded-lg border border-input bg-background text-foreground" />
                </div>
                <Button onClick={createAssignment} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : assignments.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground shadow-card">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No assignments yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map(a => {
            const sub = submissions[a.id];
            const isPastDue = a.due_date && new Date(a.due_date) < new Date();
            return (
              <div key={a.id} className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{a.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{(a as any).courses?.title}</span>
                    </div>
                    {a.description && <p className="text-sm text-muted-foreground mb-2">{a.description}</p>}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {a.due_date && (
                        <span className={`flex items-center gap-1 ${isPastDue ? "text-red-500" : ""}`}>
                          <Clock className="w-3 h-3" /> Due: {new Date(a.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span>Max: {a.max_marks} marks</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isTeacher ? (
                      <Button variant="outline" size="sm" onClick={() => { setSelectedAssignment(a); loadSubmissions(a.id); setGradeDialogOpen(true); }}>
                        View Submissions
                      </Button>
                    ) : sub ? (
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${sub.graded_at ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                        {sub.graded_at ? <><CheckCircle className="w-3 h-3" /> {sub.marks_obtained}/{a.max_marks}</> : <><Clock className="w-3 h-3" /> Submitted</>}
                      </span>
                    ) : (
                      <Button size="sm" disabled={!!isPastDue} onClick={() => { setSelectedAssignment(a); setSubmitDialogOpen(true); }}>
                        <Upload className="w-3.5 h-3.5 mr-1" /> Submit
                      </Button>
                    )}
                  </div>
                </div>
                {sub?.feedback && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium text-foreground">Feedback: </span>
                    <span className="text-muted-foreground">{sub.feedback}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student submit dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit: {selectedAssignment?.title}</DialogTitle></DialogHeader>
          <Textarea value={submitContent} onChange={e => setSubmitContent(e.target.value)} placeholder="Write your answer here..." rows={6} />
          <Button onClick={submitAssignment} className="w-full">Submit Assignment</Button>
        </DialogContent>
      </Dialog>

      {/* Teacher grade dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Submissions: {selectedAssignment?.title}</DialogTitle></DialogHeader>
          {submissionsList.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No submissions yet</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {submissionsList.map((s: any) => (
                <div key={s.id} className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-foreground">{s.profiles?.full_name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{s.content}</p>
                  {s.graded_at ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-foreground font-medium">{s.marks_obtained}/{selectedAssignment?.max_marks}</span>
                      {s.feedback && <span className="text-muted-foreground">— {s.feedback}</span>}
                    </div>
                  ) : (
                    <div className="flex gap-2 items-end">
                      <input type="number" placeholder="Marks" value={gradeForm.submissionId === s.id ? gradeForm.marks : ""} onChange={e => setGradeForm({ marks: e.target.value, feedback: gradeForm.submissionId === s.id ? gradeForm.feedback : "", submissionId: s.id })} className="w-20 px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm" />
                      <input placeholder="Feedback" value={gradeForm.submissionId === s.id ? gradeForm.feedback : ""} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value, submissionId: s.id })} className="flex-1 px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm" />
                      <Button size="sm" onClick={gradeSubmission} disabled={gradeForm.submissionId !== s.id}>Grade</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
