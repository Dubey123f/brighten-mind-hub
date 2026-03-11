import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Search } from "lucide-react";

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get courses by this instructor, then enrollments
      const { data: courses } = await supabase.from("courses").select("id").eq("created_by", user.id);
      if (!courses || courses.length === 0) { setStudents([]); return; }
      const courseIds = courses.map(c => c.id);
      const { data } = await supabase
        .from("enrollments")
        .select("progress, courses(title), profiles!enrollments_user_id_profiles_fkey(full_name)")
        .in("course_id", courseIds);
      setStudents(data || []);
    };
    load();
  }, [user]);

  const filtered = students.filter(s => (s.profiles as any)?.full_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">My Students</h1>
      <p className="text-muted-foreground mb-6">Students enrolled in your courses</p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No Students Yet</h3>
          <p className="text-muted-foreground">Students will appear here once they enroll in your courses.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Student</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Course</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Progress</th>
            </tr></thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-4 text-sm font-medium text-foreground">{(s.profiles as any)?.full_name || "Unknown"}</td>
                  <td className="p-4 text-sm text-muted-foreground">{(s.courses as any)?.title || "N/A"}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden max-w-[120px]">
                        <div className="h-full rounded-full gradient-primary" style={{ width: `${s.progress || 0}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(Number(s.progress) || 0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
