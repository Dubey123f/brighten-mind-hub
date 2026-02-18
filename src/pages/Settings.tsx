import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Settings</h1>
      <p className="text-muted-foreground mb-6">Platform configuration</p>
      <div className="bg-card rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Platform Settings</h3>
            <p className="text-sm text-muted-foreground">Configure your IntelliLearn instance</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { label: "Platform Name", value: "IntelliLearn" },
            { label: "Default Language", value: "English" },
            { label: "Max Upload Size", value: "50 MB" },
            { label: "Auto-confirm Signups", value: "Enabled" },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <span className="text-sm font-medium text-foreground">{s.label}</span>
              <span className="text-sm text-muted-foreground">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
