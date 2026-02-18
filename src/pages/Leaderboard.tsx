import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Flame, Star } from "lucide-react";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("user_points")
        .select("points, streak_days, profiles!user_points_user_id_fkey(full_name)")
        .order("points", { ascending: false })
        .limit(20);
      setLeaders(data || []);
    };
    load();
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Leaderboard</h1>
      <p className="text-muted-foreground mb-6">Top learners on the platform</p>

      {leaders.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-card">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No Rankings Yet</h3>
          <p className="text-muted-foreground">Complete quizzes and lessons to earn points!</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border grid grid-cols-12 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="col-span-1">#</span>
            <span className="col-span-5">Student</span>
            <span className="col-span-3 text-center">Points</span>
            <span className="col-span-3 text-center">Streak</span>
          </div>
          {leaders.map((l, i) => (
            <div key={i} className={`p-4 grid grid-cols-12 items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i < 3 ? "bg-primary/5" : ""}`}>
              <span className="col-span-1 text-lg">{i < 3 ? medals[i] : <span className="text-sm text-muted-foreground">{i + 1}</span>}</span>
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                  {((l.profiles as any)?.full_name || "U")[0].toUpperCase()}
                </div>
                <span className="font-medium text-sm text-foreground">{(l.profiles as any)?.full_name || "Unknown"}</span>
              </div>
              <div className="col-span-3 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                  <Star className="w-3.5 h-3.5 text-accent" /> {l.points}
                </span>
              </div>
              <div className="col-span-3 text-center">
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Flame className="w-3.5 h-3.5 text-destructive" /> {l.streak_days}d
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
