import { FileText } from "lucide-react";

export default function Reports() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Reports</h1>
      <p className="text-muted-foreground mb-6">Download progress reports</p>

      <div className="bg-card rounded-2xl p-6 shadow-card">
        <div className="space-y-3">
          {[
            { title: "Weekly Progress Summary", date: "Feb 17, 2026" },
            { title: "Quiz Performance Report", date: "Feb 14, 2026" },
            { title: "Monthly Engagement Report", date: "Feb 1, 2026" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <FileText className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.date}</p>
              </div>
              <button className="text-xs font-medium text-primary hover:underline">Download</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
