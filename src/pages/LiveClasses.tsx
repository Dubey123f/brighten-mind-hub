import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Video, Plus, Calendar, Clock, Users, Play, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  created_by: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  created_at: string;
  creator_name?: string;
}

export default function LiveClasses() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", scheduled_at: "", duration_minutes: 60 });
  const isInstructor = role === "instructor" || role === "admin";

  const loadClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("live_classes")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (data) {
      // Fetch creator names
      const userIds = [...new Set(data.map((c: any) => c.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      setClasses(data.map((c: any) => ({ ...c, creator_name: profileMap[c.created_by] || "Unknown" })));
    }
    if (error) toast.error(error.message);
    setLoading(false);
  };

  useEffect(() => { loadClasses(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.scheduled_at) { toast.error("Title and schedule required"); return; }
    const { error } = await supabase.from("live_classes").insert({
      title: form.title,
      description: form.description || null,
      scheduled_at: form.scheduled_at,
      duration_minutes: form.duration_minutes,
      created_by: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Live class scheduled!");
    setShowCreate(false);
    setForm({ title: "", description: "", scheduled_at: "", duration_minutes: 60 });
    loadClasses();
  };

  const handleStatusChange = async (classId: string, newStatus: string) => {
    const { error } = await supabase.from("live_classes").update({ status: newStatus }).eq("id", classId);
    if (error) { toast.error(error.message); return; }
    toast.success(newStatus === "live" ? "Class is now live!" : "Class ended");
    loadClasses();
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: "bg-muted text-muted-foreground",
      live: "bg-destructive/10 text-destructive animate-pulse",
      ended: "bg-secondary text-secondary-foreground",
    };
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles[status] || styles.scheduled}`}>
        {status === "live" ? "🔴 LIVE" : status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Classes</h1>
          <p className="text-muted-foreground">Join live sessions and interact with instructors in real-time</p>
        </div>
        {isInstructor && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Schedule Class</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule a Live Class</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <Input placeholder="Class title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-foreground">Schedule Date & Time</label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Duration (minutes)</label>
                  <Input type="number" min={15} max={300} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} />
                </div>
                <Button className="w-full" onClick={handleCreate}>Schedule</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-48" />)}
        </div>
      ) : classes.length === 0 ? (
        <Card className="p-12 text-center">
          <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No Live Classes</h3>
          <p className="text-muted-foreground">
            {isInstructor ? "Schedule your first live class!" : "No classes scheduled yet."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id} className={`hover:shadow-md transition-shadow ${cls.status === "live" ? "ring-2 ring-destructive/50" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{cls.title}</CardTitle>
                  {statusBadge(cls.status)}
                </div>
                {cls.description && <p className="text-sm text-muted-foreground mt-1">{cls.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{cls.creator_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(cls.scheduled_at), "PPP p")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{cls.duration_minutes} mins</span>
                </div>
                <div className="flex gap-2 pt-2">
                  {cls.status === "live" && (
                    <Button className="flex-1" onClick={() => navigate(`/dashboard/live-classes/${cls.id}`)}>
                      <Play className="w-4 h-4 mr-1" /> Join Class
                    </Button>
                  )}
                  {cls.status === "scheduled" && isInstructor && cls.created_by === user?.id && (
                    <Button className="flex-1" onClick={() => handleStatusChange(cls.id, "live")}>
                      <Play className="w-4 h-4 mr-1" /> Go Live
                    </Button>
                  )}
                  {cls.status === "scheduled" && !isInstructor && (
                    <Button variant="outline" className="flex-1" disabled>Starts Soon</Button>
                  )}
                  {cls.status === "live" && isInstructor && cls.created_by === user?.id && (
                    <Button variant="destructive" size="sm" onClick={() => handleStatusChange(cls.id, "ended")}>
                      <StopCircle className="w-4 h-4" />
                    </Button>
                  )}
                  {cls.status === "ended" && (
                    <Button variant="secondary" className="flex-1" disabled>Ended</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
