import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Award, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Marks() {
  const { user, role } = useAuth();
  const isTeacher = role === "instructor" || role === "admin";

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [marks, setMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ exam_name: "", max_marks: "100" });
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});

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
    if (!form.exam_name || !selectedCourse) { toast.error("Exam name required"); return; }
    try {
      const entries = Object.entries(marksInput).filter(([, v]) => v !== "");
      for (const [studentId, marksVal] of entries) {
        const { error } = await supabase.from("marks").insert({
          course_id: selectedCourse,
          student_id: studentId,
          exam_name: form.exam_name,
          max_marks: Number(form.max_marks) || 100,
          marks_obtained: Number(marksVal) || 0,
          entered_by: user!.id,
        });
        if (error) throw error;
      }
      toast.success("Marks saved!");
      setForm({ exam_name: "", max_marks: "100" });
      setMarksInput({});
      setDialogOpen(false);
      loadMarks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Student: compute aggregates
  const totalMarks = marks.reduce((s, m) => s + Number(m.marks_obtained || 0), 0);
  const totalMax = marks.reduce((s, m) => s + Number(m.max_marks || 0), 0);
  const overallPercentage = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

  // Teacher: group marks by exam
  const examGroups = marks.reduce((acc: Record<string, any[]>, m) => {
    const key = m.exam_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">{isTeacher ? "Marks Management" : "My Marks"}</h1>
          <p className="text-muted-foreground">{isTeacher ? "Enter and manage student marks" : "View your grades and performance"}</p>
        </div>
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
                <input value={form.exam_name} onChange={e => setForm(f => ({ ...f, exam_name: e.target.value }))} placeholder="Exam Name (e.g. Midterm)" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" />
                <input type="number" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: e.target.value }))} placeholder="Max Marks" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" />
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {students.map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="text-sm text-foreground flex-1">{s.name}</span>
                      <input type="number" placeholder="Marks" value={marksInput[s.id] || ""} onChange={e => setMarksInput(p => ({ ...p, [s.id]: e.target.value }))} className="w-24 px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm" />
                    </div>
                  ))}
                </div>
                <Button onClick={saveMarks} className="w-full">Save Marks</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Student overview cards */}
      {!isTeacher && marks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <p className="text-xs text-muted-foreground uppercase mb-1">Total Exams</p>
            <p className="text-2xl font-bold text-foreground">{marks.length}</p>
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <p className="text-xs text-muted-foreground uppercase mb-1">Total Marks</p>
            <p className="text-2xl font-bold text-foreground">{totalMarks}/{totalMax}</p>
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <p className="text-xs text-muted-foreground uppercase mb-1">Overall %</p>
            <p className={`text-2xl font-bold ${overallPercentage >= 60 ? "text-green-500" : overallPercentage >= 40 ? "text-yellow-500" : "text-red-500"}`}>{overallPercentage}%</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : marks.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground shadow-card">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>{isTeacher ? "Select a course and add marks" : "No marks available yet"}</p>
        </div>
      ) : isTeacher ? (
        // Teacher: grouped by exam
        <div className="space-y-4">
          {Object.entries(examGroups).map(([examName, records]) => (
            <div key={examName} className="bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-foreground">{examName}</h3>
                <span className="text-xs text-muted-foreground">Max: {(records as any[])[0]?.max_marks}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Marks</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">%</th>
                  </tr>
                </thead>
                <tbody>
                  {(records as any[]).map((m: any) => {
                    const pct = m.max_marks > 0 ? Math.round((m.marks_obtained / m.max_marks) * 100) : 0;
                    return (
                      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-3 text-sm text-foreground">{m.profiles?.full_name || "Unknown"}</td>
                        <td className="p-3 text-sm font-medium text-foreground">{m.marks_obtained}/{m.max_marks}</td>
                        <td className="p-3"><span className={`text-sm font-medium ${pct >= 60 ? "text-green-500" : pct >= 40 ? "text-yellow-500" : "text-red-500"}`}>{pct}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        // Student: flat list
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Exam</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Course</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Marks</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">%</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m: any) => {
                const pct = m.max_marks > 0 ? Math.round((m.marks_obtained / m.max_marks) * 100) : 0;
                return (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4 text-sm font-medium text-foreground">{m.exam_name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{m.courses?.title || "N/A"}</td>
                    <td className="p-4 text-sm font-medium text-foreground">{m.marks_obtained}/{m.max_marks}</td>
                    <td className="p-4"><span className={`text-sm font-bold ${pct >= 60 ? "text-green-500" : pct >= 40 ? "text-yellow-500" : "text-red-500"}`}>{pct}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
