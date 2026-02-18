import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RichTextEditor from "@/components/RichTextEditor";
import {
  ArrowLeft, Plus, BookOpen, Play, CheckCircle, Clock, GripVertical,
  Trash2, Edit2, Save, X, ChevronDown, ChevronRight, Video, FileText,
} from "lucide-react";

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Record<string, any[]>>({});

  // Module/lesson creation
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({ title: "", content: "", video_url: "", duration_minutes: 0 });

  // Lesson editing
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Progress tracking
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  const isOwner = role === "instructor" || role === "admin";

  useEffect(() => {
    if (!courseId) return;
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    setLoading(true);
    const [cRes, mRes] = await Promise.all([
      supabase.from("courses").select("*, profiles!courses_created_by_fkey(full_name)").eq("id", courseId!).single(),
      supabase.from("modules").select("*").eq("course_id", courseId!).order("sort_order"),
    ]);
    setCourse(cRes.data);
    setModules(mRes.data || []);

    // Load all lessons for all modules
    if (mRes.data && mRes.data.length > 0) {
      const moduleIds = mRes.data.map((m: any) => m.id);
      const { data: allLessons } = await supabase
        .from("lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("sort_order");

      const grouped: Record<string, any[]> = {};
      (allLessons || []).forEach((l: any) => {
        if (!grouped[l.module_id]) grouped[l.module_id] = [];
        grouped[l.module_id].push(l);
      });
      setLessons(grouped);

      // Load progress
      if (user) {
        const lessonIds = (allLessons || []).map((l: any) => l.id);
        if (lessonIds.length > 0) {
          const { data: progress } = await supabase
            .from("lesson_progress")
            .select("lesson_id")
            .eq("user_id", user.id)
            .eq("completed", true)
            .in("lesson_id", lessonIds);
          setCompletedLessons(new Set((progress || []).map((p: any) => p.lesson_id)));
        }
      }

      setExpandedModule(mRes.data[0]?.id || null);
    }
    setLoading(false);
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || !courseId) return;
    const { error } = await supabase.from("modules").insert({
      course_id: courseId,
      title: newModuleTitle,
      sort_order: modules.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Module added!");
    setNewModuleTitle("");
    setShowAddModule(false);
    loadCourse();
  };

  const handleAddLesson = async (moduleId: string) => {
    if (!newLesson.title.trim()) return;
    const { error } = await supabase.from("lessons").insert({
      module_id: moduleId,
      title: newLesson.title,
      content: newLesson.content,
      video_url: newLesson.video_url || null,
      duration_minutes: newLesson.duration_minutes || 0,
      sort_order: (lessons[moduleId]?.length || 0),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Lesson added!");
    setNewLesson({ title: "", content: "", video_url: "", duration_minutes: 0 });
    setShowAddLesson(null);
    loadCourse();
  };

  const handleSaveLessonContent = async (lessonId: string) => {
    const { error } = await supabase.from("lessons").update({ content: editContent }).eq("id", lessonId);
    if (error) { toast.error(error.message); return; }
    toast.success("Lesson saved!");
    setEditingLesson(null);
    loadCourse();
  };

  const handleTogglePublish = async () => {
    if (!course) return;
    const { error } = await supabase.from("courses").update({ is_published: !course.is_published }).eq("id", course.id);
    if (error) { toast.error(error.message); return; }
    toast.success(course.is_published ? "Course unpublished" : "Course published!");
    loadCourse();
  };

  const handleMarkComplete = async (lessonId: string) => {
    if (!user) return;
    const { error } = await supabase.from("lesson_progress").upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,lesson_id" });
    if (error) { toast.error(error.message); return; }
    setCompletedLessons(prev => new Set(prev).add(lessonId));
    toast.success("Lesson completed! 🎉");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!course) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Course not found.</p>
      <button onClick={() => navigate("/dashboard/courses")} className="text-primary hover:underline mt-2 text-sm">Back to courses</button>
    </div>
  );

  const totalLessons = Object.values(lessons).flat().length;
  const completedCount = completedLessons.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate("/dashboard/courses")} className="mt-1 p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl font-bold text-foreground">{course.title}</h1>
            {course.is_published ? (
              <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">Published</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium">Draft</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{course.description || "No description"}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>{course.category}</span>
            <span>•</span>
            <span>{course.difficulty}</span>
            <span>•</span>
            <span>{modules.length} modules</span>
            <span>•</span>
            <span>{totalLessons} lessons</span>
          </div>
        </div>
        {isOwner && (
          <button onClick={handleTogglePublish} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${course.is_published ? "border border-border text-foreground hover:bg-muted" : "gradient-primary text-primary-foreground hover:opacity-90"}`}>
            {course.is_published ? "Unpublish" : "Publish"}
          </button>
        )}
      </div>

      {/* Progress bar for students */}
      {role === "student" && totalLessons > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Your Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{totalLessons} lessons</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Modules */}
      <div className="space-y-3">
        {modules.map((m, mi) => (
          <div key={m.id} className="bg-card rounded-2xl shadow-card overflow-hidden">
            <button
              onClick={() => setExpandedModule(expandedModule === m.id ? null : m.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
            >
              {expandedModule === m.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <span className="text-xs font-medium text-primary">Module {mi + 1}</span>
              <span className="font-display font-semibold text-foreground flex-1 text-left">{m.title}</span>
              <span className="text-xs text-muted-foreground">{lessons[m.id]?.length || 0} lessons</span>
            </button>

            {expandedModule === m.id && (
              <div className="border-t border-border">
                {(lessons[m.id] || []).map((l, li) => (
                  <div key={l.id} className="border-b border-border last:border-0">
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                      {completedLessons.has(l.id) ? (
                        <CheckCircle className="w-5 h-5 text-success shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/dashboard/courses/${courseId}/lessons/${l.id}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {l.title}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {l.video_url && <><Video className="w-3 h-3" /> Video</>}
                          {l.content && <><FileText className="w-3 h-3" /> Content</>}
                          {l.duration_minutes > 0 && <><Clock className="w-3 h-3" /> {l.duration_minutes} min</>}
                        </div>
                      </div>
                      {isOwner && editingLesson !== l.id && (
                        <button onClick={() => { setEditingLesson(l.id); setEditContent(l.content || ""); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {role === "student" && !completedLessons.has(l.id) && (
                        <button onClick={() => handleMarkComplete(l.id)} className="text-xs font-medium text-primary hover:underline">
                          Mark Done
                        </button>
                      )}
                    </div>

                    {/* Inline editor for lesson content */}
                    {editingLesson === l.id && (
                      <div className="px-4 pb-4">
                        <RichTextEditor content={editContent} onChange={setEditContent} placeholder="Write your lesson content..." />
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={() => setEditingLesson(null)} className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted">
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleSaveLessonContent(l.id)} className="px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add lesson button */}
                {isOwner && (
                  <div className="p-4">
                    {showAddLesson === m.id ? (
                      <div className="space-y-3 animate-fade-in">
                        <input value={newLesson.title} onChange={e => setNewLesson(p => ({ ...p, title: e.target.value }))} placeholder="Lesson title" className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                        <input value={newLesson.video_url} onChange={e => setNewLesson(p => ({ ...p, video_url: e.target.value }))} placeholder="Video URL (optional)" className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                        <RichTextEditor content={newLesson.content} onChange={(html) => setNewLesson(p => ({ ...p, content: html }))} placeholder="Lesson content..." />
                        <div className="flex gap-2">
                          <button onClick={() => setShowAddLesson(null)} className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted">Cancel</button>
                          <button onClick={() => handleAddLesson(m.id)} className="px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add Lesson</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddLesson(m.id)} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                        <Plus className="w-3.5 h-3.5" /> Add Lesson
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add module */}
        {isOwner && (
          <div className="bg-card rounded-2xl p-4 shadow-card">
            {showAddModule ? (
              <div className="flex items-center gap-3 animate-fade-in">
                <input value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} placeholder="Module title" className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                <button onClick={() => setShowAddModule(false)} className="px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted">Cancel</button>
                <button onClick={handleAddModule} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add</button>
              </div>
            ) : (
              <button onClick={() => setShowAddModule(true)} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                <Plus className="w-4 h-4" /> Add Module
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
