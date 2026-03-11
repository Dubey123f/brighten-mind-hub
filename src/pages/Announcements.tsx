import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Announcements() {
  const { user, role } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: "", content: "" });

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*, profiles!announcements_user_id_profiles_fkey(full_name)").order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!user || !newAnn.title.trim()) return;
    const { error } = await supabase.from("announcements").insert({ ...newAnn, user_id: user.id, is_global: true });
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement posted!");
    setShowCreate(false);
    setNewAnn({ title: "", content: "" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground text-sm">Platform-wide announcements</p>
        </div>
        {(role === "admin" || role === "instructor") && (
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> New
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-card-hover animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-foreground mb-4">New Announcement</h3>
            <div className="space-y-3">
              <input value={newAnn.title} onChange={e => setNewAnn(p => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground" />
              <textarea value={newAnn.content} onChange={e => setNewAnn(p => ({ ...p, content: e.target.value }))} placeholder="Content" rows={4} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground resize-none" />
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleCreate} className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">Post</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No Announcements</h3>
          <p className="text-muted-foreground">Nothing to show yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="bg-card rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-primary" />
                <h4 className="font-display font-semibold text-foreground">{a.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{a.content}</p>
              <p className="text-xs text-muted-foreground">by {(a.profiles as any)?.full_name || "Admin"} • {new Date(a.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
