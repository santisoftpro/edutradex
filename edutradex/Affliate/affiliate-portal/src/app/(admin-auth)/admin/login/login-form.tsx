"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff, Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { adminLoginSchema, type AdminLoginInput } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginError {
  message: string;
  code?: string;
  attemptsRemaining?: number;
  lockedUntil?: string;
  retryAfter?: number;
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<LoginError | null>(null);

  const form = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: AdminLoginInput) {
    setIsLoading(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email.toLowerCase().trim(),
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setLoginError({
          message: result.error || "Login failed",
          attemptsRemaining: result.attemptsRemaining,
          lockedUntil: result.lockedUntil,
          retryAfter: result.retryAfter,
        });
        return;
      }

      toast.success("Welcome to the admin panel!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setLoginError({
        message: "An unexpected error occurred. Please try again.",
        code: "NETWORK_ERROR",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md glass-card border-red-500/20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <Shield className="h-6 w-6 text-red-500" />
        </div>
        <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
        <CardDescription>
          Sign in to access the administration panel
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loginError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">{loginError.message}</div>
              {loginError.attemptsRemaining !== undefined && loginError.attemptsRemaining > 0 && (
                <div className="mt-1 text-xs opacity-80">
                  {loginError.attemptsRemaining} attempt{loginError.attemptsRemaining !== 1 ? 's' : ''} remaining before lockout
                </div>
              )}
              {loginError.lockedUntil && (
                <div className="mt-1 text-xs opacity-80">
                  Locked until: {new Date(loginError.lockedUntil).toLocaleTimeString()}
                </div>
              )}
              {loginError.retryAfter && (
                <div className="mt-1 text-xs opacity-80">
                  Please wait {Math.ceil(loginError.retryAfter / 60)} minute{Math.ceil(loginError.retryAfter / 60) !== 1 ? 's' : ''} before trying again
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@optigobroker.com"
                      autoComplete="email"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Sign In to Admin
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
