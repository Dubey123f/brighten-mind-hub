import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AttendanceRecord {
  id: string;
  course_id: string;
  student_id: string;
  date: string;
  status: string;
  remarks: string | null;
  student_name?: string;
  course_title?: string;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  present: { icon: CheckCircle, color: "text-green-500 bg-green-500/10", label: "Present" },
  absent: { icon: XCircle, color: "text-red-500 bg-red-500/10", label: "Absent" },
  late: { icon: Clock, color: "text-yellow-500 bg-yellow-500/10", label: "Late" },
  excused: { icon: AlertCircle, color: "text-blue-500 bg-blue-500/10", label: "Excused" },
};

export default function Attendance() {
  const { user, role } = useAuth();
  const isTeacher = role === "instructor" || role === "admin";

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load courses
  useEffect(() => {
    const load = async () => {
      if (isTeacher) {
        const { data } = await supabase.from("courses").select("id, title").order("title");
        setCourses(data || []);
      } else {
        // Student: get enrolled courses
        const { data } = await supabase
          .from("enrollments")
          .select("course_id, courses(id, title)")
          .eq("user_id", user!.id);
        setCourses(data?.map((e: any) => e.courses).filter(Boolean) || []);
      }
    };
    if (user) load();
  }, [user, role]);

  // Teacher: load enrolled students for selected course
  useEffect(() => {
    if (!isTeacher || !selectedCourse) return;
    const load = async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("user_id, profiles!enrollments_user_id_fkey(full_name)")
        .eq("course_id", selectedCourse);
      const list = (data || []).map((e: any) => ({
        id: e.user_id,
        name: (e as any).profiles?.full_name || "Unknown",
      }));
      setStudents(list);

      // Load existing attendance for this date
      const { data: att } = await supabase
        .from("attendance")
        .select("*")
        .eq("course_id", selectedCourse)
        .eq("date", selectedDate);
      const map: Record<string, string> = {};
      (att || []).forEach((a: any) => { map[a.student_id] = a.status; });
      setAttendanceMap(map);
    };
    load();
  }, [selectedCourse, selectedDate, isTeacher]);

  // Student: load own attendance records
  useEffect(() => {
    if (isTeacher || !user) return;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("attendance")
        .select("*, courses(title)")
        .eq("student_id", user.id)
        .order("date", { ascending: false });
      if (selectedCourse) query = query.eq("course_id", selectedCourse);
      const { data } = await query;
      setRecords((data || []).map((r: any) => ({ ...r, course_title: r.courses?.title })));
      setLoading(false);
    };
    load();
  }, [user, role, selectedCourse]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    if (!selectedCourse || !user) return;
    setSaving(true);
    try {
      for (const student of students) {
        const status = attendanceMap[student.id] || "absent";
        const { error } = await supabase.from("attendance").upsert(
          { course_id: selectedCourse, student_id: student.id, date: selectedDate, status, marked_by: user.id },
          { onConflict: "course_id,student_id,date" }
        );
        if (error) throw error;
      }
      toast.success("Attendance saved successfully!");
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  // Student stats
  const totalRecords = records.length;
  const presentCount = records.filter(r => r.status === "present" || r.status === "late").length;
  const percentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  if (isTeacher) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Attendance Management</h1>
        <p className="text-muted-foreground mb-6">Mark and manage student attendance</p>

        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select Course" /></SelectTrigger>
            <SelectContent>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-foreground"
          />
        </div>

        {selectedCourse && students.length > 0 ? (
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Student</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {Object.entries(statusConfig).map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          const active = (attendanceMap[s.id] || "absent") === key;
                          return (
                            <button
                              key={key}
                              onClick={() => handleStatusChange(s.id, key)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? cfg.color + " ring-2 ring-offset-1 ring-current" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                            >
                              <Icon className="w-3.5 h-3.5" /> {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-border flex justify-end">
              <Button onClick={saveAttendance} disabled={saving}>
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>
        ) : selectedCourse ? (
          <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No students enrolled in this course</p>
          </div>
        ) : null}
      </div>
    );
  }

  // Student view
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">My Attendance</h1>
      <p className="text-muted-foreground mb-6">Track your attendance across courses</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <p className="text-xs text-muted-foreground uppercase mb-1">Total Classes</p>
          <p className="text-2xl font-bold text-foreground">{totalRecords}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <p className="text-xs text-muted-foreground uppercase mb-1">Present</p>
          <p className="text-2xl font-bold text-green-500">{presentCount}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <p className="text-xs text-muted-foreground uppercase mb-1">Attendance %</p>
          <p className={`text-2xl font-bold ${percentage >= 75 ? "text-green-500" : "text-red-500"}`}>{percentage}%</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All Courses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Courses</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Date</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Course</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => {
              const cfg = statusConfig[r.status] || statusConfig.absent;
              const Icon = cfg.icon;
              return (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-4 text-sm text-foreground">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm text-foreground">{r.course_title || "N/A"}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" /> {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {records.length === 0 && (
              <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No attendance records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
