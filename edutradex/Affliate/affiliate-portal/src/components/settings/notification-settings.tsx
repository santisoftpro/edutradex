"use client";

import { useState } from "react";
import {
  Bell,
  Mail,
  DollarSign,
  Users,
  Award,
  AlertTriangle,
  Megaphone,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  icon: typeof Bell;
  email: boolean;
  push: boolean;
}

const defaultPreferences: NotificationPreference[] = [
  {
    id: "payouts",
    label: "Payout Updates",
    description: "Get notified when your withdrawals are processed",
    icon: DollarSign,
    email: true,
    push: true,
  },
  {
    id: "referrals",
    label: "New Referrals",
    description: "Get notified when someone registers through your link",
    icon: Users,
    email: true,
    push: true,
  },
  {
    id: "ftd",
    label: "FTD Notifications",
    description: "Get notified when a referral makes their first deposit",
    icon: Award,
    email: true,
    push: true,
  },
  {
    id: "level",
    label: "Level Changes",
    description: "Get notified when your partner level changes",
    icon: Award,
    email: true,
    push: true,
  },
  {
    id: "fraud",
    label: "Fraud Alerts",
    description: "Important alerts about potential fraud activity",
    icon: AlertTriangle,
    email: true,
    push: true,
  },
  {
    id: "news",
    label: "News & Updates",
    description: "Platform updates, new features, and announcements",
    icon: Megaphone,
    email: false,
    push: true,
  },
];

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  function handleToggle(id: string, type: "email" | "push") {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.id === id ? { ...pref, [type]: !pref[type] } : pref
      )
    );
    setHasChanges(true);
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: preferences.map((p) => ({
            id: p.id,
            email: p.email,
            push: p.push,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      toast.success("Notification preferences saved");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about important events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-end gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Push
            </div>
          </div>

          <Separator />

          {/* Preferences */}
          <div className="space-y-4">
            {preferences.map((pref) => {
              const Icon = pref.icon;

              return (
                <div
                  key={pref.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label className="text-base font-medium">{pref.label}</Label>
                      <p className="text-sm text-muted-foreground">
                        {pref.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <Switch
                      checked={pref.email}
                      onCheckedChange={() => handleToggle(pref.id, "email")}
                    />
                    <Switch
                      checked={pref.push}
                      onCheckedChange={() => handleToggle(pref.id, "push")}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreferences((prev) =>
                  prev.map((p) => ({ ...p, email: true, push: true }))
                );
                setHasChanges(true);
              }}
            >
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreferences((prev) =>
                  prev.map((p) => ({ ...p, email: false, push: false }))
                );
                setHasChanges(true);
              }}
            >
              Disable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreferences((prev) =>
                  prev.map((p) => ({ ...p, email: false }))
                );
                setHasChanges(true);
              }}
            >
              Email Only Off
            </Button>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Digest
          </CardTitle>
          <CardDescription>Configure email summary preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-base font-medium">Daily Summary</Label>
              <p className="text-sm text-muted-foreground">
                Receive a daily email with your performance summary
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-base font-medium">Weekly Report</Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly email with detailed analytics
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-base font-medium">Monthly Statement</Label>
              <p className="text-sm text-muted-foreground">
                Receive monthly earnings and commission statements
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
