import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";

export default function CoursesPage() {
  const { role, user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "", category: "General", difficulty: "Beginner" });

  const loadCourses = async () => {
    setLoading(true);
    let q = supabase.from("courses").select("*, profiles!courses_created_by_fkey(full_name)");
    if (role === "instructor" && user) {
      q = q.eq("created_by", user.id);
    } else {
      q = q.eq("is_published", true);
    }
    const { data } = await q.order("created_at", { ascending: false });
    setCourses(data || []);
    setLoading(false);
  };

  useEffect(() => { loadCourses(); }, [role, user]);

  const handleCreate = async () => {
    if (!user || !newCourse.title.trim()) return;
    const { error } = await supabase.from("courses").insert({
      ...newCourse,
      created_by: user.id,
      is_published: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Course created!");
    setShowCreate(false);
    setNewCourse({ title: "", description: "", category: "General", difficulty: "Beginner" });
    loadCourses();
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    const { error } = await supabase.from("enrollments").insert({ user_id: user.id, course_id: courseId });
    if (error) {
      if (error.code === "23505") toast.info("Already enrolled!");
      else toast.error(error.message);
      return;
    }
    toast.success("Enrolled successfully!");
  };

  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {role === "instructor" ? "My Courses" : "Browse Courses"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {role === "instructor" ? "Create and manage your courses" : "Discover and enroll in courses"}
          </p>
        </div>
        {(role === "instructor" || role === "admin") && (
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> New Course
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none"
        />
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-card-hover animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-foreground mb-4">Create New Course</h3>
            <div className="space-y-3">
              <input value={newCourse.title} onChange={e => setNewCourse(p => ({ ...p, title: e.target.value }))} placeholder="Course title" className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground" />
              <textarea value={newCourse.description} onChange={e => setNewCourse(p => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground resize-none" />
              <select value={newCourse.difficulty} onChange={e => setNewCourse(p => ({ ...p, difficulty: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground">
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleCreate} className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-card animate-pulse">
              <div className="h-36 bg-muted" />
              <div className="p-4 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No Courses Found</h3>
          <p className="text-muted-foreground">{role === "instructor" ? "Create your first course to get started!" : "Check back later for new courses."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all group">
              <div className="h-36 gradient-primary relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent)]" />
                <div className="absolute bottom-3 left-3">
                  <span className="px-2 py-1 rounded-md bg-card/80 text-xs font-medium text-foreground">{c.difficulty}</span>
                </div>
              </div>
              <div className="p-4">
                <span className="text-xs font-medium text-primary">{c.category}</span>
                <h4 className="font-display font-semibold text-foreground mt-1 mb-1">{c.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description || "No description"}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">by {c.profiles?.full_name || "Unknown"}</span>
                  {role === "student" && (
                    <button onClick={() => handleEnroll(c.id)} className="text-xs font-medium text-primary hover:underline">
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
