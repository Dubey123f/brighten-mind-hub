import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Shield, BookOpen, GraduationCap, Search, Trash2, Edit, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user, role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [stats, setStats] = useState({ total: 0, admins: 0, instructors: 0, students: 0, parents: 0 });
  const [editUser, setEditUser] = useState<any>(null);
  const [editRole, setEditRole] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Parent-child linking
  const [parentEmail, setParentEmail] = useState("");
  const [childEmail, setChildEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [links, setLinks] = useState<any[]>([]);

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
    const list = data || [];
    setUsers(list);
    const counts = { total: list.length, admins: 0, instructors: 0, students: 0, parents: 0 };
    list.forEach((u: any) => {
      const r = (u.user_roles as any[])?.[0]?.role || "student";
      if (r === "admin") counts.admins++;
      else if (r === "instructor") counts.instructors++;
      else if (r === "parent") counts.parents++;
      else counts.students++;
    });
    setStats(counts);
  };

  const loadLinks = async () => {
    const { data } = await supabase.from("parent_child_links").select("*, parent:profiles!parent_child_links_parent_id_fkey(full_name, user_id), child:profiles!parent_child_links_child_id_fkey(full_name, user_id)");
    setLinks(data || []);
  };

  useEffect(() => { loadUsers(); loadLinks(); }, []);

  const filtered = users.filter(u => {
    const name = u.full_name?.toLowerCase() || "";
    const matchSearch = name.includes(search.toLowerCase());
    const userRole = (u.user_roles as any[])?.[0]?.role || "student";
    const matchRole = filterRole === "all" || userRole === filterRole;
    return matchSearch && matchRole;
  });

  const updateUserRole = async () => {
    if (!editUser || !editRole) return;
    try {
      const { data: existing } = await supabase.from("user_roles").select("id").eq("user_id", editUser.user_id).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("user_roles").update({ role: editRole as any }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: editUser.user_id, role: editRole as any });
        if (error) throw error;
      }
      toast.success(`Role updated to ${editRole}`);
      setDialogOpen(false);
      setEditUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const linkParentChild = async () => {
    if (!parentEmail || !childEmail) { toast.error("Both emails required"); return; }
    setLinking(true);
    try {
      const { data, error } = await supabase.rpc("admin_link_parent_to_child", {
        parent_email: parentEmail, child_email: childEmail,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success) {
        toast.success(result.message);
        setParentEmail("");
        setChildEmail("");
        loadLinks();
      } else {
        toast.error(result?.message || "Link failed");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setLinking(false);
  };

  const unlinkParentChild = async (linkId: string) => {
    await supabase.from("parent_child_links").delete().eq("id", linkId);
    toast.success("Unlinked");
    loadLinks();
  };

  const roleIcon = (r: string) => {
    switch (r) {
      case "admin": return <Shield className="w-3.5 h-3.5" />;
      case "instructor": return <BookOpen className="w-3.5 h-3.5" />;
      case "parent": return <Users className="w-3.5 h-3.5" />;
      default: return <GraduationCap className="w-3.5 h-3.5" />;
    }
  };

  const roleColor = (r: string) => {
    switch (r) {
      case "admin": return "bg-red-500/10 text-red-500";
      case "instructor": return "bg-blue-500/10 text-blue-500";
      case "parent": return "bg-purple-500/10 text-purple-500";
      default: return "bg-primary/10 text-primary";
    }
  };

  if (role !== "admin") {
    return <div className="p-8 text-center text-muted-foreground">Access denied. Admin only.</div>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Admin Panel</h1>
      <p className="text-muted-foreground mb-6">Manage users, roles, and parent-child links</p>

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="links">Parent-Child Links</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Users", value: stats.total, color: "text-foreground" },
              { label: "Admins", value: stats.admins, color: "text-red-500" },
              { label: "Teachers", value: stats.instructors, color: "text-blue-500" },
              { label: "Students", value: stats.students, color: "text-primary" },
              { label: "Parents", value: stats.parents, color: "text-purple-500" },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-2xl p-4 shadow-card">
                <p className="text-xs text-muted-foreground uppercase mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none" />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="instructor">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">User</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Role</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Joined</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const mainRole = (u.user_roles as any[])?.[0]?.role || "student";
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                            {(u.full_name || "U")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground">{u.full_name || "Unnamed"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${roleColor(mainRole)}`}>
                          {roleIcon(mainRole)} {mainRole}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm" onClick={() => { setEditUser(u); setEditRole(mainRole); setDialogOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="links">
          {/* Link Parent-Child */}
          <div className="bg-card rounded-2xl p-6 shadow-card mb-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Link2 className="w-4 h-4" /> Link Parent to Child</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Parent Email</Label>
                <Input value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="parent@example.com" />
              </div>
              <div>
                <Label>Child (Student) Email</Label>
                <Input value={childEmail} onChange={e => setChildEmail(e.target.value)} placeholder="student@example.com" />
              </div>
            </div>
            <Button onClick={linkParentChild} disabled={linking} className="gap-2">
              <Link2 className="w-4 h-4" /> {linking ? "Linking..." : "Link Accounts"}
            </Button>
          </div>

          {/* Existing Links */}
          <div className="bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Existing Links ({links.length})</h3>
            </div>
            {links.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">No parent-child links yet</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Parent</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Child</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Linked On</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map(link => (
                    <tr key={link.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm text-foreground">{(link as any).parent?.full_name || "Unknown"}</td>
                      <td className="p-4 text-sm text-foreground">{(link as any).child?.full_name || "Unknown"}</td>
                      <td className="p-4 text-sm text-muted-foreground">{new Date(link.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm" onClick={() => unlinkParentChild(link.id)} className="text-destructive hover:text-destructive">
                          <Unlink className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Role: {editUser?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="instructor">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={updateUserRole} className="w-full">Update Role</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
