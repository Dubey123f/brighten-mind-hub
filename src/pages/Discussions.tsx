import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, User } from "lucide-react";
import { toast } from "sonner";

export default function Discussions() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: c } = await supabase.from("courses").select("id, title").eq("is_published", true);
      setCourses(c || []);
      if (c && c.length > 0) {
        setSelectedCourse(c[0].id);
        loadPosts(c[0].id);
      }
    };
    load();
  }, []);

  const loadPosts = async (courseId: string) => {
    const { data } = await supabase
      .from("discussion_posts")
      .select("*, profiles!discussion_posts_user_id_fkey(full_name)")
      .eq("course_id", courseId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });
    setPosts(data || []);
  };

  const handlePost = async () => {
    if (!user || !newPost.trim() || !selectedCourse) return;
    const { error } = await supabase.from("discussion_posts").insert({
      course_id: selectedCourse,
      user_id: user.id,
      content: newPost,
    });
    if (error) { toast.error(error.message); return; }
    setNewPost("");
    loadPosts(selectedCourse);
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Discussions</h1>
      <p className="text-muted-foreground mb-6">Engage with peers and instructors</p>

      <div className="mb-4">
        <select
          value={selectedCourse}
          onChange={e => { setSelectedCourse(e.target.value); loadPosts(e.target.value); }}
          className="px-4 py-2.5 rounded-lg border border-input bg-background text-foreground"
        >
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {/* Post input */}
      <div className="bg-card rounded-2xl p-4 shadow-card mb-6">
        <textarea
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Share your thoughts or ask a question..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground resize-none mb-3"
        />
        <div className="flex justify-end">
          <button onClick={handlePost} disabled={!newPost.trim()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Send className="w-4 h-4" /> Post
          </button>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No Discussions Yet</h3>
          <p className="text-muted-foreground">Be the first to start a discussion!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="bg-card rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                  {((p.profiles as any)?.full_name || "U")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{(p.profiles as any)?.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{p.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
