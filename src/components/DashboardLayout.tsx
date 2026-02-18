import { ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  GraduationCap, LayoutDashboard, BookOpen, Users, BarChart3,
  Trophy, MessageSquare, Settings, LogOut, FileText, HelpCircle,
  Bell, User, Brain, Award, ClipboardList,
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: any;
}

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Users", url: "/dashboard/users", icon: Users },
    { title: "Courses", url: "/dashboard/courses", icon: BookOpen },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "Announcements", url: "/dashboard/announcements", icon: Bell },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ],
  instructor: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "My Courses", url: "/dashboard/courses", icon: BookOpen },
    { title: "Quizzes", url: "/dashboard/quizzes", icon: ClipboardList },
    { title: "Students", url: "/dashboard/students", icon: Users },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "Discussions", url: "/dashboard/discussions", icon: MessageSquare },
  ],
  student: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "My Courses", url: "/dashboard/courses", icon: BookOpen },
    { title: "Quizzes", url: "/dashboard/quizzes", icon: ClipboardList },
    { title: "Progress", url: "/dashboard/progress", icon: BarChart3 },
    { title: "Leaderboard", url: "/dashboard/leaderboard", icon: Trophy },
    { title: "Discussions", url: "/dashboard/discussions", icon: MessageSquare },
    { title: "AI Tutor", url: "/dashboard/ai-tutor", icon: Brain },
  ],
  parent: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Child Progress", url: "/dashboard/progress", icon: BarChart3 },
    { title: "Courses", url: "/dashboard/courses", icon: BookOpen },
    { title: "Reports", url: "/dashboard/reports", icon: FileText },
  ],
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const items = navByRole[role || "student"] || navByRole.student;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r border-sidebar-border">
          <div className="p-4 flex items-center gap-2 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-foreground">IntelliLearn</span>
            </Link>
          </div>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-2">
                Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                {(profile?.full_name || "U")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
            <SidebarTrigger />
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground capitalize px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
              {role}
            </span>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
