"use client";

import { Settings } from "lucide-react";

export function SettingsHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        Settings
      </h1>
      <p className="text-muted-foreground">
        Manage your account settings and preferences.
      </p>
    </div>
  );
}
