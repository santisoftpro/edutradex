"use client";

import { useState } from "react";
import {
  Share2,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  ExternalLink,
  Trash2,
  AlertCircle,
} from "lucide-react";
import type { PartnerLevel, SocialVerificationStatus } from "@prisma/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLevelConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SocialChannel {
  id: string;
  platform: string;
  profileUrl: string;
  username: string | null;
  followersCount: number | null;
  status: string;
  verifiedAt: Date | null;
  rejectionReason: string | null;
}

interface SocialVerificationProps {
  channels: SocialChannel[];
  socialStatus: SocialVerificationStatus;
  currentLevel: PartnerLevel;
}

const platformIcons: Record<string, string> = {
  YOUTUBE: "🎬",
  INSTAGRAM: "📸",
  TIKTOK: "🎵",
  TWITTER: "🐦",
  FACEBOOK: "📘",
  TELEGRAM: "✈️",
  LINKEDIN: "💼",
  TWITCH: "🎮",
  DISCORD: "💬",
  WEBSITE: "🌐",
};

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  VERIFIED: {
    icon: CheckCircle,
    color: "text-green-400",
    label: "Verified",
  },
  SUBMITTED: {
    icon: Clock,
    color: "text-amber-400",
    label: "Pending Review",
  },
  DRAFT: {
    icon: Clock,
    color: "text-muted-foreground",
    label: "Draft",
  },
  REJECTED: {
    icon: XCircle,
    color: "text-red-400",
    label: "Rejected",
  },
};

const platforms = [
  { value: "YOUTUBE", label: "YouTube" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "TWITTER", label: "Twitter/X" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "TELEGRAM", label: "Telegram" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TWITCH", label: "Twitch" },
  { value: "DISCORD", label: "Discord" },
  { value: "WEBSITE", label: "Website" },
];

export function SocialVerification({
  channels,
  socialStatus,
  currentLevel,
}: SocialVerificationProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [platform, setPlatform] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [username, setUsername] = useState("");

  const levelConfig = getLevelConfig(currentLevel);
  const requiresSocial = levelConfig.socialRequired;
  const hasVerifiedChannel = channels.some((c) => c.status === "VERIFIED");

  async function handleAddChannel() {
    if (!platform || !profileUrl) {
      toast.error("Please select a platform and enter your profile URL.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/social-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, profileUrl, username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add channel");
      }

      toast.success("Your social channel has been submitted for verification.");

      setIsAddDialogOpen(false);
      setPlatform("");
      setProfileUrl("");
      setUsername("");

      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add channel");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteChannel(channelId: string) {
    try {
      const response = await fetch(`/api/social-channels/${channelId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete channel");
      }

      toast.success("Your social channel has been removed.");

      window.location.reload();
    } catch {
      toast.error("Failed to remove channel");
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Social Verification
          </CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle>Add Social Channel</DialogTitle>
                <DialogDescription>
                  Add your social media channel for verification. This helps unlock higher partner levels.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {platformIcons[p.value]} {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileUrl">Profile URL</Label>
                  <Input
                    id="profileUrl"
                    placeholder="https://..."
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username (optional)</Label>
                  <Input
                    id="username"
                    placeholder="@username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddChannel} disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Channel"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Social status indicator */}
        {requiresSocial && (
          <div
            className={cn(
              "p-3 rounded-lg border",
              hasVerifiedChannel
                ? "bg-green-500/10 border-green-500/20"
                : "bg-amber-500/10 border-amber-500/20"
            )}
          >
            <div className="flex items-center gap-2">
              {hasVerifiedChannel ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-400" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  hasVerifiedChannel ? "text-green-400" : "text-amber-400"
                )}
              >
                {hasVerifiedChannel
                  ? "Social requirement met"
                  : "Social verification required for next level"}
              </span>
            </div>
          </div>
        )}

        {/* Channels list */}
        {channels.length === 0 ? (
          <div className="text-center py-8">
            <Share2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No social channels added yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your social channels to unlock higher levels
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map((channel) => {
              const status = statusConfig[channel.status] || statusConfig.SUBMITTED;
              const StatusIcon = status.icon;

              return (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {platformIcons[channel.platform] || "🌐"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {channel.username || channel.platform}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", status.color)}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      {channel.followersCount && (
                        <p className="text-xs text-muted-foreground">
                          {channel.followersCount.toLocaleString()} followers
                        </p>
                      )}
                      {channel.status === "REJECTED" && channel.rejectionReason && (
                        <p className="text-xs text-red-400 mt-1">
                          Reason: {channel.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      asChild
                    >
                      <a
                        href={channel.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    {channel.status !== "VERIFIED" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        onClick={() => handleDeleteChannel(channel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info about social verification */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Social channels are reviewed within 24-48 hours. Verified channels help you unlock
            higher partner levels with better revenue shares.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
