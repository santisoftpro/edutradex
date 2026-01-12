"use client";

import { User, Shield, Bell, Wallet } from "lucide-react";
import type { PartnerLevel } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "./profile-settings";
import { SecuritySettings } from "./security-settings";
import { NotificationSettings } from "./notification-settings";
import { WithdrawalSettings } from "./withdrawal-settings";

interface Partner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  phone: string | null;
  country: string | null;
  level: PartnerLevel;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

interface SavedAddress {
  coin: string;
  network: string;
  address: string;
}

interface SettingsTabsProps {
  partner: Partner;
  savedAddresses: SavedAddress[];
}

export function SettingsTabs({ partner, savedAddresses }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
        <TabsTrigger value="profile" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Profile</span>
        </TabsTrigger>
        <TabsTrigger value="security" className="gap-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Security</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications</span>
        </TabsTrigger>
        <TabsTrigger value="withdrawal" className="gap-2">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Withdrawal</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileSettings partner={partner} />
      </TabsContent>

      <TabsContent value="security">
        <SecuritySettings
          twoFactorEnabled={partner.twoFactorEnabled}
          emailVerified={partner.emailVerified}
          email={partner.email}
        />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationSettings />
      </TabsContent>

      <TabsContent value="withdrawal">
        <WithdrawalSettings savedAddresses={savedAddresses} />
      </TabsContent>
    </Tabs>
  );
}
