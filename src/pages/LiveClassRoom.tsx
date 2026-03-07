import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Video, VideoOff, MessageSquare, StopCircle } from "lucide-react";
import JitsiMeeting from "@/components/JitsiMeeting";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
}

interface LiveClassData {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
}

export default function LiveClassRoom() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const [liveClass, setLiveClass] = useState<LiveClassData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOwner = liveClass?.created_by === user?.id;

  useEffect(() => {
    if (!classId) return;
    loadClass();
    loadMessages();

    // Realtime chat subscription
    const channel = supabase
      .channel(`live-class-${classId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_class_messages",
        filter: `live_class_id=eq.${classId}`,
      }, (payload) => {
        const msg = payload.new as any;
        setMessages((prev) => [...prev, { ...msg, sender_name: profileMap[msg.user_id] || "User" }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [classId]);

  // Auto scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadClass = async () => {
    const { data } = await supabase.from("live_classes").select("*").eq("id", classId!).single();
    if (data) setLiveClass(data as any);
    else { toast.error("Class not found"); navigate("/dashboard/live-classes"); }
    setLoading(false);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("live_class_messages")
      .select("*")
      .eq("live_class_id", classId!)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map: Record<string, string> = {};
      profiles?.forEach((p: any) => { map[p.user_id] = p.full_name; });
      setProfileMap(map);
      setMessages(data.map((m: any) => ({ ...m, sender_name: map[m.user_id] || "User" })));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const { error } = await supabase.from("live_class_messages").insert({
      live_class_id: classId!,
      user_id: user!.id,
      message: newMessage.trim(),
    });
    if (error) { toast.error(error.message); return; }
    // Optimistically add
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      user_id: user!.id,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
      sender_name: profile?.full_name || "You",
    }]);
    setNewMessage("");
  };

  const handleEndClass = async () => {
    await supabase.from("live_classes").update({ status: "ended" }).eq("id", classId!);
    toast.success("Class ended");
    navigate("/dashboard/live-classes");
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!liveClass) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/live-classes")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              {liveClass.title}
              {liveClass.status === "live" && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full animate-pulse">🔴 LIVE</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{liveClass.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
            <MessageSquare className="w-4 h-4 mr-1" /> Chat
          </Button>
          {isOwner && liveClass.status === "live" && (
            <Button variant="destructive" size="sm" onClick={handleEndClass}>
              <StopCircle className="w-4 h-4 mr-1" /> End Class
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 pt-4 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-muted rounded-xl flex items-center justify-center relative overflow-hidden">
            {liveClass.status === "ended" ? (
              <div className="text-center">
                <VideoOff className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Class has ended</h3>
                <p className="text-muted-foreground">This live session is no longer active</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Video className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {isOwner ? "You are presenting" : "Live Session"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isOwner ? "Your students can see this class" : "Listening to the instructor"}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          {liveClass.status === "live" && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Button
                variant={micOn ? "secondary" : "destructive"}
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={() => setMicOn(!micOn)}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
              <Button
                variant={cameraOn ? "secondary" : "destructive"}
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={() => setCameraOn(!cameraOn)}
              >
                {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <Card className="w-80 flex flex-col shrink-0">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">Live Chat</span>
            </div>
            <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
              <div className="space-y-3">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hello! 👋</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? "items-end" : "items-start"}`}>
                    <span className="text-xs text-muted-foreground mb-0.5">
                      {msg.user_id === user?.id ? "You" : msg.sender_name}
                    </span>
                    <div className={`px-3 py-2 rounded-lg text-sm max-w-[90%] ${
                      msg.user_id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {liveClass.status === "live" && (
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="text-sm"
                />
                <Button size="icon" onClick={sendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
