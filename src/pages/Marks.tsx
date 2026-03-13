import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Award, Plus, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ReportCard from "@/components/ReportCard";

const EXAM_TYPES = [
  { key: "mid_sem", label: "Mid Semester", maxMarks: 30 },
  { key: "end_sem", label: "End Semester", maxMarks: 70 },
];
const INTERNAL_MAX = 20;

function calcInternal(midObtained: number, midMax: number) {
  if (midMax <= 0) return 0;
  return Math.round((midObtained / midMax) * INTERNAL_MAX);
}

export default function Marks() {
  const { user, role } = useAuth();
  const isTeacher = role === "instructor" || role === "admin";

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [marks, setMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [examType, setExamType] = useState("");
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [showReport, setShowReport] = useState(false);
  const [reportCourse, setReportCourse] = useState<any>(null);

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

  const loadMarks = async () => {
    setLoading(true);
    if (isTeacher && selectedCourse) {
      const { data } = await supabase.from("marks").select("*, profiles!marks_student_id_profiles_fkey(full_name)").eq("course_id", selectedCourse).order("exam_name");
      setMarks(data || []);
      const { data: enrolled } = await supabase.from("enrollments").select("user_id, profiles!enrollments_user_id_profiles_fkey(full_name)").eq("course_id", selectedCourse);
      setStudents((enrolled || []).map((e: any) => ({ id: e.user_id, name: e.profiles?.full_name || "Unknown" })));
    } else if (!isTeacher && user) {
      let query = supabase.from("marks").select("*, courses(title)").eq("student_id", user.id).order("created_at", { ascending: false });
      if (selectedCourse && selectedCourse !== "all") query = query.eq("course_id", selectedCourse);
      const { data } = await query;
      setMarks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) loadMarks(); }, [user, role, selectedCourse]);

  const saveMarks = async () => {
    if (!examType || !selectedCourse) { toast.error("Exam type select karein"); return; }
    const exam = EXAM_TYPES.find(e => e.key === examType);
    if (!exam) return;
    try {
      const entries = Object.entries(marksInput).filter(([, v]) => v !== "");
      if (entries.length === 0) { toast.error("Koi marks enter karein"); return; }
      for (const [studentId, marksVal] of entries) {
        const obtained = Math.min(Number(marksVal) || 0, exam.maxMarks);
        const { error } = await supabase.from("marks").upsert({
          course_id: selectedCourse,
          student_id: studentId,
          exam_name: exam.key,
          max_marks: exam.maxMarks,
          marks_obtained: obtained,
          entered_by: user!.id,
        }, { onConflict: "course_id,student_id,exam_name", ignoreDuplicates: false });
        if (error) {
          // fallback: try insert if upsert fails due to missing unique constraint
          const { error: insertErr } = await supabase.from("marks").insert({
            course_id: selectedCourse,
            student_id: studentId,
            exam_name: exam.key,
            max_marks: exam.maxMarks,
            marks_obtained: obtained,
            entered_by: user!.id,
          });
          if (insertErr) throw insertErr;
        }
      }
      toast.success("Marks saved!");
      setMarksInput({});
      setDialogOpen(false);
      loadMarks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Build student results per course for report card
  const buildStudentResults = () => {
    const byCourse: Record<string, { title: string; mid?: any; end?: any }> = {};
    for (const m of marks) {
      const cid = m.course_id;
      if (!byCourse[cid]) byCourse[cid] = { title: m.courses?.title || "N/A" };
      if (m.exam_name === "mid_sem") byCourse[cid].mid = m;
      if (m.exam_name === "end_sem") byCourse[cid].end = m;
    }
    return Object.entries(byCourse).map(([courseId, data]) => {
      const midObt = Number(data.mid?.marks_obtained || 0);
      const midMax = Number(data.mid?.max_marks || 30);
      const endObt = Number(data.end?.marks_obtained || 0);
      const endMax = Number(data.end?.max_marks || 70);
      const internal = calcInternal(midObt, midMax);
      const total = midObt + endObt + internal;
      const totalMax = midMax + endMax + INTERNAL_MAX;
      const pct = totalMax > 0 ? Math.round((total / totalMax) * 100) : 0;
      let grade = "F";
      if (pct >= 90) grade = "A+";
      else if (pct >= 80) grade = "A";
      else if (pct >= 70) grade = "B+";
      else if (pct >= 60) grade = "B";
      else if (pct >= 50) grade = "C";
      else if (pct >= 40) grade = "D";
      return { courseId, courseTitle: data.title, midObt, midMax, endObt, endMax, internal, internalMax: INTERNAL_MAX, total, totalMax, pct, grade };
    });
  };

  // Teacher: group by student
  const buildTeacherView = () => {
    const byStudent: Record<string, { name: string; mid?: any; end?: any }> = {};
    for (const m of marks) {
      const sid = m.student_id;
      if (!byStudent[sid]) byStudent[sid] = { name: m.profiles?.full_name || "Unknown" };
      if (m.exam_name === "mid_sem") byStudent[sid].mid = m;
      if (m.exam_name === "end_sem") byStudent[sid].end = m;
    }
    return Object.entries(byStudent).map(([sid, data]) => {
      const midObt = Number(data.mid?.marks_obtained || 0);
      const midMax = Number(data.mid?.max_marks || 30);
      const endObt = Number(data.end?.marks_obtained || 0);
      const endMax = Number(data.end?.max_marks || 70);
      const internal = calcInternal(midObt, midMax);
      const total = midObt + endObt + internal;
      const totalMax = midMax + endMax + INTERNAL_MAX;
      const pct = totalMax > 0 ? Math.round((total / totalMax) * 100) : 0;
      let grade = "F";
      if (pct >= 90) grade = "A+";
      else if (pct >= 80) grade = "A";
      else if (pct >= 70) grade = "B+";
      else if (pct >= 60) grade = "B";
      else if (pct >= 50) grade = "C";
      else if (pct >= 40) grade = "D";
      return { studentId: sid, name: data.name, midObt, midMax, endObt, endMax, internal, internalMax: INTERNAL_MAX, total, totalMax, pct, grade };
    });
  };

  const studentResults = !isTeacher ? buildStudentResults() : [];
  const teacherResults = isTeacher ? buildTeacherView() : [];

  const grandTotal = studentResults.reduce((s, r) => s + r.total, 0);
  const grandMax = studentResults.reduce((s, r) => s + r.totalMax, 0);
  const overallPct = grandMax > 0 ? Math.round((grandTotal / grandMax) * 100) : 0;

  const selectedCourseName = courses.find(c => c.id === selectedCourse)?.title || "";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">{isTeacher ? "Marks Management" : "My Marks & Report Card"}</h1>
          <p className="text-muted-foreground">{isTeacher ? "Enter Mid Sem & End Sem marks" : "View grades, internal marks & download report card"}</p>
        </div>
        {!isTeacher && studentResults.length > 0 && (
          <Button onClick={() => setShowReport(true)} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Report Card
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Course" /></SelectTrigger>
          <SelectContent>
            {!isTeacher && <SelectItem value="all">All Courses</SelectItem>}
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        {isTeacher && selectedCourse && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Marks</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Enter Marks</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger><SelectValue placeholder="Select Exam Type" /></SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map(e => (
                      <SelectItem key={e.key} value={e.key}>{e.label} (Max: {e.maxMarks})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {examType && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Max marks: {EXAM_TYPES.find(e => e.key === examType)?.maxMarks} | Internal marks ({INTERNAL_MAX}) will be auto-calculated from Mid Sem
                    </p>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {students.map(s => (
                        <div key={s.id} className="flex items-center gap-3">
                          <span className="text-sm text-foreground flex-1">{s.name}</span>
                          <input
                            type="number"
                            min="0"
                            max={EXAM_TYPES.find(e => e.key === examType)?.maxMarks}
                            placeholder="Marks"
                            value={marksInput[s.id] || ""}
                            onChange={e => setMarksInput(p => ({ ...p, [s.id]: e.target.value }))}
                            className="w-24 px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <Button onClick={saveMarks} className="w-full">Save Marks</Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Student overview cards */}
      {!isTeacher && studentResults.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <p className="text-xs text-muted-foreground uppercase mb-1">Courses</p>
            <p className="text-2xl font-bold text-foreground">{studentResults.length}</p>
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <p className="text-xs text-muted-foreground uppercase mb-1">Total Marks</p>
            <p className="text-2xl font-bold text-foreground">{grandTotal}/{grandMax}</p>
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <p className="text-xs text-muted-foreground uppercase mb-1">Overall %</p>
            <p className={`text-2xl font-bold ${overallPct >= 60 ? "text-green-500" : overallPct >= 40 ? "text-yellow-500" : "text-red-500"}`}>{overallPct}%</p>
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <p className="text-xs text-muted-foreground uppercase mb-1">Overall Grade</p>
            <p className="text-2xl font-bold text-primary">
              {overallPct >= 90 ? "A+" : overallPct >= 80 ? "A" : overallPct >= 70 ? "B+" : overallPct >= 60 ? "B" : overallPct >= 50 ? "C" : overallPct >= 40 ? "D" : "F"}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (marks.length === 0 && studentResults.length === 0) ? (
        <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground shadow-card">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>{isTeacher ? "Select a course and add marks" : "No marks available yet"}</p>
        </div>
      ) : isTeacher ? (
        /* Teacher view: table with mid/end/internal/total per student */
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">{selectedCourseName} — Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Mid Sem<br /><span className="text-[10px] opacity-70">({EXAM_TYPES[0].maxMarks})</span></th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">End Sem<br /><span className="text-[10px] opacity-70">({EXAM_TYPES[1].maxMarks})</span></th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Internal<br /><span className="text-[10px] opacity-70">({INTERNAL_MAX})</span></th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Total<br /><span className="text-[10px] opacity-70">({EXAM_TYPES[0].maxMarks + EXAM_TYPES[1].maxMarks + INTERNAL_MAX})</span></th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">%</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Grade</th>
                </tr>
              </thead>
              <tbody>
                {teacherResults.map(r => (
                  <tr key={r.studentId} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-sm font-medium text-foreground">{r.name}</td>
                    <td className="p-3 text-sm text-center text-foreground">{r.midObt}</td>
                    <td className="p-3 text-sm text-center text-foreground">{r.endObt}</td>
                    <td className="p-3 text-sm text-center text-muted-foreground italic">{r.internal}</td>
                    <td className="p-3 text-sm text-center font-semibold text-foreground">{r.total}</td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-bold ${r.pct >= 60 ? "text-green-500" : r.pct >= 40 ? "text-yellow-500" : "text-red-500"}`}>{r.pct}%</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${r.grade === "F" ? "bg-red-100 text-red-700" : r.pct >= 70 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{r.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Student view: detailed marks table */
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Course</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase">Mid Sem<br /><span className="text-[10px] opacity-70">({EXAM_TYPES[0].maxMarks})</span></th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase">End Sem<br /><span className="text-[10px] opacity-70">({EXAM_TYPES[1].maxMarks})</span></th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase">Internal<br /><span className="text-[10px] opacity-70">({INTERNAL_MAX})</span></th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase">Total</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase">%</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase">Grade</th>
                </tr>
              </thead>
              <tbody>
                {studentResults.map(r => (
                  <tr key={r.courseId} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4 text-sm font-medium text-foreground">{r.courseTitle}</td>
                    <td className="p-4 text-sm text-center text-foreground">{r.midObt}/{r.midMax}</td>
                    <td className="p-4 text-sm text-center text-foreground">{r.endObt}/{r.endMax}</td>
                    <td className="p-4 text-sm text-center text-muted-foreground italic">{r.internal}/{r.internalMax}</td>
                    <td className="p-4 text-sm text-center font-semibold text-foreground">{r.total}/{r.totalMax}</td>
                    <td className="p-4 text-center">
                      <span className={`text-sm font-bold ${r.pct >= 60 ? "text-green-500" : r.pct >= 40 ? "text-yellow-500" : "text-red-500"}`}>{r.pct}%</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${r.grade === "F" ? "bg-red-100 text-red-700" : r.pct >= 70 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{r.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Card Modal */}
      {showReport && !isTeacher && (
        <ReportCard
          studentName={user?.user_metadata?.full_name || "Student"}
          results={studentResults}
          overallPct={overallPct}
          grandTotal={grandTotal}
          grandMax={grandMax}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
