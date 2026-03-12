import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Plus, Upload, CheckCircle, Clock, Trash2, Download, Paperclip, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  const [questionsDialogOpen, setQuestionsDialogOpen] = useState(false);
  const [viewQuestionsDialogOpen, setViewQuestionsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [assignmentQuestions, setAssignmentQuestions] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({ title: "", description: "", course_id: "", due_date: "", max_marks: "100" });
  const [submitContent, setSubmitContent] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [gradeForm, setGradeForm] = useState({ marks: "", feedback: "", submissionId: "" });

  // Questions form
  const [questions, setQuestions] = useState<string[]>([""]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Questions management
  const loadQuestions = async (assignmentId: string) => {
    const { data } = await supabase
      .from("assignment_questions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("sort_order", { ascending: true });
    setAssignmentQuestions(data || []);
    return data || [];
  };

  const openQuestionsDialog = async (assignment: any) => {
    setSelectedAssignment(assignment);
    const qs = await loadQuestions(assignment.id);
    setQuestions(qs.length > 0 ? qs.map((q: any) => q.question_text) : [""]);
    setQuestionsDialogOpen(true);
  };

  const saveQuestions = async () => {
    if (!selectedAssignment) return;
    const validQuestions = questions.filter(q => q.trim());
    if (validQuestions.length === 0) { toast.error("Add at least one question"); return; }

    // Delete existing
    await supabase.from("assignment_questions").delete().eq("assignment_id", selectedAssignment.id);

    // Insert new
    const rows = validQuestions.map((q, i) => ({
      assignment_id: selectedAssignment.id,
      question_text: q.trim(),
      sort_order: i,
    }));
    const { error } = await supabase.from("assignment_questions").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success("Questions saved!");
    setQuestionsDialogOpen(false);
  };

  // File upload
  const uploadSubmissionFile = async (): Promise<string | null> => {
    if (!uploadFile || !user) return null;
    const ext = uploadFile.name.split('.').pop();
    const filePath = `${user.id}/${selectedAssignment.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("assignment-files").upload(filePath, uploadFile);
    if (error) { toast.error("File upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("assignment-files").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const submitAssignment = async () => {
    if (!selectedAssignment) return;
    if (!submitContent.trim() && !uploadFile) { toast.error("Please write an answer or upload a file"); return; }

    setUploading(true);
    let fileUrl: string | null = null;
    if (uploadFile) {
      fileUrl = await uploadSubmissionFile();
      if (!fileUrl && uploadFile) { setUploading(false); return; }
    }

    const { error } = await supabase.from("assignment_submissions").insert({
      assignment_id: selectedAssignment.id,
      student_id: user!.id,
      content: submitContent || null,
      file_url: fileUrl,
    });
    if (error) { toast.error(error.message); setUploading(false); return; }
    toast.success("Assignment submitted!");
    setSubmitContent("");
    setUploadFile(null);
    setSubmitDialogOpen(false);
    setUploading(false);
    loadAssignments();
  };

  const openSubmitDialog = async (assignment: any) => {
    setSelectedAssignment(assignment);
    const qs = await loadQuestions(assignment.id);
    setAssignmentQuestions(qs);
    setSubmitContent("");
    setUploadFile(null);
    setSubmitDialogOpen(true);
  };

  const openViewQuestions = async (assignment: any) => {
    setSelectedAssignment(assignment);
    const qs = await loadQuestions(assignment.id);
    setAssignmentQuestions(qs);
    setViewQuestionsDialogOpen(true);
  };

  const loadSubmissions = async (assignmentId: string) => {
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*, profiles!assignment_submissions_student_id_profiles_fkey(full_name)")
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
              <DialogHeader>
                <DialogTitle>Create Assignment</DialogTitle>
                <DialogDescription>Fill in the details to create a new assignment.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" />
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" />
                <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                  <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                  <Input type="number" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: e.target.value }))} placeholder="Max Marks" />
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
            const dueDate = a.due_date ? new Date(a.due_date) : null;
            const isPastDue = dueDate ? (() => {
              const endOfDueDay = new Date(dueDate);
              endOfDueDay.setHours(23, 59, 59, 999);
              return endOfDueDay < new Date();
            })() : false;
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
                        <span className={`flex items-center gap-1 ${isPastDue ? "text-destructive" : ""}`}>
                          <Clock className="w-3 h-3" /> Due: {new Date(a.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span>Max: {a.max_marks} marks</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {isTeacher ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openQuestionsDialog(a)}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Questions
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedAssignment(a); loadSubmissions(a.id); setGradeDialogOpen(true); }}>
                          View Submissions
                        </Button>
                      </>
                    ) : sub ? (
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${sub.graded_at ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                        {sub.graded_at ? <><CheckCircle className="w-3 h-3" /> {sub.marks_obtained}/{a.max_marks}</> : <><Clock className="w-3 h-3" /> Submitted</>}
                      </span>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openViewQuestions(a)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Questions
                        </Button>
                        <Button size="sm" disabled={!!isPastDue} onClick={() => openSubmitDialog(a)}>
                          <Upload className="w-3.5 h-3.5 mr-1" /> Submit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {sub?.feedback && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium text-foreground">Feedback: </span>
                    <span className="text-muted-foreground">{sub.feedback}</span>
                  </div>
                )}
                {sub?.file_url && (
                  <div className="mt-2">
                    <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Paperclip className="w-3 h-3" /> View uploaded file
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Teacher: Manage Questions Dialog */}
      <Dialog open={questionsDialogOpen} onOpenChange={setQuestionsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Questions: {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>Add questions that students need to answer for this assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-sm font-medium text-muted-foreground mt-2 shrink-0">Q{i + 1}.</span>
                <Textarea
                  value={q}
                  onChange={e => {
                    const updated = [...questions];
                    updated[i] = e.target.value;
                    setQuestions(updated);
                  }}
                  placeholder={`Question ${i + 1}`}
                  rows={2}
                  className="flex-1"
                />
                {questions.length > 1 && (
                  <Button variant="ghost" size="icon" className="shrink-0 mt-1" onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => setQuestions([...questions, ""])} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Add Question
          </Button>
          <Button onClick={saveQuestions} className="w-full">Save Questions</Button>
        </DialogContent>
      </Dialog>

      {/* Student: View Questions Dialog */}
      <Dialog open={viewQuestionsDialogOpen} onOpenChange={setViewQuestionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Questions: {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>Review the questions before submitting your assignment.</DialogDescription>
          </DialogHeader>
          {assignmentQuestions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No specific questions for this assignment. Submit your work directly.</p>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {assignmentQuestions.map((q: any, i: number) => (
                <div key={q.id} className="p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium text-foreground">Q{i + 1}. </span>
                  <span className="text-sm text-muted-foreground">{q.question_text}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit: {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>Answer the questions and/or upload your file.</DialogDescription>
          </DialogHeader>

          {assignmentQuestions.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-foreground mb-1">Questions:</p>
              {assignmentQuestions.map((q: any, i: number) => (
                <p key={q.id} className="text-sm text-muted-foreground">
                  <span className="font-medium">Q{i + 1}.</span> {q.question_text}
                </p>
              ))}
            </div>
          )}

          <Textarea
            value={submitContent}
            onChange={e => setSubmitContent(e.target.value)}
            placeholder="Write your answer here..."
            rows={5}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Upload File (PDF, DOC, DOCX, Images)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                  <Paperclip className="w-4 h-4 text-primary" />
                  {uploadFile.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={e => { e.stopPropagation(); setUploadFile(null); }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  Click to upload PDF, DOC, or Image
                </div>
              )}
            </div>
          </div>

          <Button onClick={submitAssignment} className="w-full" disabled={uploading}>
            {uploading ? "Uploading..." : "Submit Assignment"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Teacher Grade Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submissions: {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>Review and grade student submissions.</DialogDescription>
          </DialogHeader>
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
                  {s.content && <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{s.content}</p>}
                  {s.file_url && (
                    <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2">
                      <Download className="w-3 h-3" /> Download submitted file
                    </a>
                  )}
                  {s.graded_at ? (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-foreground font-medium">{s.marks_obtained}/{selectedAssignment?.max_marks}</span>
                      {s.feedback && <span className="text-muted-foreground">— {s.feedback}</span>}
                    </div>
                  ) : (
                    <div className="flex gap-2 items-end mt-2">
                      <Input type="number" placeholder="Marks" className="w-20" value={gradeForm.submissionId === s.id ? gradeForm.marks : ""} onChange={e => setGradeForm({ marks: e.target.value, feedback: gradeForm.submissionId === s.id ? gradeForm.feedback : "", submissionId: s.id })} />
                      <Input placeholder="Feedback" className="flex-1" value={gradeForm.submissionId === s.id ? gradeForm.feedback : ""} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value, submissionId: s.id })} />
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
