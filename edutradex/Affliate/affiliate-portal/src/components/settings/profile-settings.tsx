"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Phone, Globe, Calendar, Award, Save } from "lucide-react";
import type { PartnerLevel } from "@prisma/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getLevelConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

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

interface ProfileSettingsProps {
  partner: Partner;
}

const countries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "MX", name: "Mexico" },
  { code: "AE", name: "UAE" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "NG", name: "Nigeria" },
  { code: "ZA", name: "South Africa" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "TR", name: "Turkey" },
  { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "MY", name: "Malaysia" },
  { code: "SG", name: "Singapore" },
  { code: "RU", name: "Russia" },
  { code: "UA", name: "Ukraine" },
  { code: "PK", name: "Pakistan" },
];

const levelColors: Record<PartnerLevel, string> = {
  STARTER: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  BUILDER: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  GROWTH: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  ADVANCED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  PRO: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  AMBASSADOR: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function ProfileSettings({ partner }: ProfileSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const levelConfig = getLevelConfig(partner.level);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: partner.firstName,
      lastName: partner.lastName,
      displayName: partner.displayName || "",
      phone: partner.phone || "",
      country: partner.country || "",
    },
  });

  const selectedCountry = watch("country");

  async function onSubmit(data: ProfileFormData) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Account Overview
          </CardTitle>
          <CardDescription>Your account information at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg bg-white/5 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <p className="font-medium truncate">{partner.email}</p>
              {partner.emailVerified ? (
                <Badge variant="outline" className="mt-2 text-green-400 border-green-500/30">
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="mt-2 text-amber-400 border-amber-500/30">
                  Not Verified
                </Badge>
              )}
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Award className="h-4 w-4" />
                Partner Level
              </div>
              <p className="font-medium">{levelConfig.name}</p>
              <Badge variant="outline" className={cn("mt-2", levelColors[partner.level])}>
                {(levelConfig.rate * 100).toFixed(0)}% Revenue Share
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Calendar className="h-4 w-4" />
                Member Since
              </div>
              <p className="font-medium">
                {partner.createdAt.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Globe className="h-4 w-4" />
                Partner ID
              </div>
              <p className="font-mono text-sm truncate">{partner.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  className={errors.lastName ? "border-red-500" : ""}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                placeholder="How you want to be called"
                {...register("displayName")}
              />
              <p className="text-xs text-muted-foreground">
                This name will be shown instead of your full name
              </p>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    className="pl-10"
                    {...register("phone")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={selectedCountry}
                  onValueChange={(value) => setValue("country", value, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
