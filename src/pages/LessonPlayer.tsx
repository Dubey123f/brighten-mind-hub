import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle, ChevronLeft, ChevronRight, Clock, Play, Pause,
} from "lucide-react";

export default function LessonPlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [completed, setCompleted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!lessonId || !courseId) return;
    const load = async () => {
      const { data: l } = await supabase.from("lessons").select("*, modules(title, course_id)").eq("id", lessonId).single();
      setLesson(l);

      // Load all lessons in this course for navigation
      if (l) {
        const { data: mods } = await supabase.from("modules").select("id").eq("course_id", courseId!);
        if (mods) {
          const { data: all } = await supabase.from("lessons").select("id, title, module_id, sort_order").in("module_id", mods.map(m => m.id)).order("sort_order");
          setAllLessons(all || []);
        }
      }

      // Load progress
      if (user) {
        const { data: p } = await supabase.from("lesson_progress").select("completed, time_spent_seconds").eq("user_id", user.id).eq("lesson_id", lessonId).maybeSingle();
        if (p) {
          setCompleted(p.completed || false);
          setTimeSpent(p.time_spent_seconds || 0);
        }
      }
    };
    load();

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lessonId, courseId, user]);

  // Save time spent on unmount
  useEffect(() => {
    return () => {
      if (user && lessonId && timeSpent > 0) {
        supabase.from("lesson_progress").upsert({
          user_id: user.id,
          lesson_id: lessonId,
          time_spent_seconds: timeSpent,
        }, { onConflict: "user_id,lesson_id" });
      }
    };
  }, [timeSpent, user, lessonId]);

  const handleMarkComplete = async () => {
    if (!user || !lessonId) return;
    await supabase.from("lesson_progress").upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
      time_spent_seconds: timeSpent,
    }, { onConflict: "user_id,lesson_id" });
    setCompleted(true);
    toast.success("Lesson completed! 🎉");
  };

  const currentIndex = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!lesson) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Check if video URL is YouTube
  const isYouTube = lesson.video_url?.includes("youtube.com") || lesson.video_url?.includes("youtu.be");
  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top nav */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/dashboard/courses/${courseId}`)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{(lesson.modules as any)?.title || "Module"}</p>
          <h1 className="font-display text-xl font-bold text-foreground">{lesson.title}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTime(timeSpent)}</span>
        </div>
      </div>

      {/* Video player */}
      {lesson.video_url && (
        <div className="mb-6 rounded-2xl overflow-hidden bg-foreground/5 aspect-video">
          {isYouTube ? (
            <iframe
              src={getYouTubeEmbed(lesson.video_url)!}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          ) : (
            <video src={lesson.video_url} controls className="w-full h-full" />
          )}
        </div>
      )}

      {/* Content */}
      {lesson.content && (
        <div className="bg-card rounded-2xl p-6 shadow-card mb-6">
          <div
            className="prose prose-sm max-w-none text-foreground
              prose-headings:font-display prose-headings:text-foreground
              prose-p:text-foreground prose-strong:text-foreground
              prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-foreground/5 prose-pre:border prose-pre:border-border
              prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
              prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        {prevLesson ? (
          <button onClick={() => navigate(`/dashboard/courses/${courseId}/lessons/${prevLesson.id}`)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
        ) : <div />}

        {!completed ? (
          <button onClick={handleMarkComplete} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 shadow-glow">
            <CheckCircle className="w-4 h-4" /> Mark as Complete
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle className="w-4 h-4" /> Completed
          </span>
        )}

        {nextLesson ? (
          <button onClick={() => navigate(`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : <div />}
      </div>
    </div>
  );
}
