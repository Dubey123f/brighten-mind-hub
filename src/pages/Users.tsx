import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Search, Shield, BookOpen, GraduationCap } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      setUsers(data || []);
    };
    load();
  }, []);

  const filtered = users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()));

  const roleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield className="w-3.5 h-3.5" />;
      case "instructor": return <BookOpen className="w-3.5 h-3.5" />;
      case "parent": return <Users className="w-3.5 h-3.5" />;
      default: return <GraduationCap className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Users</h1>
      <p className="text-muted-foreground mb-6">Manage platform users</p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none"
        />
      </div>

      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">User</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Role</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const roles = (u.user_roles as any[]) || [];
                const mainRole = roles[0]?.role || "student";
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                          {(u.full_name || "U")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{u.full_name || "Unnamed"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                        {roleIcon(mainRole)} {mainRole}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
