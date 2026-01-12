"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DollarSign,
  Award,
  Link2,
  User,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ticketSchema = z.object({
  category: z.enum([
    "PAYMENTS_WITHDRAWALS",
    "AFFILIATE_LEVEL",
    "LINKS_TRACKING",
    "ACCOUNT_LOGIN",
    "FRAUD_REPORT",
    "OTHER",
  ]),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  {
    value: "PAYMENTS_WITHDRAWALS",
    label: "Payments & Withdrawals",
    icon: DollarSign,
    description: "Issues with payouts, withdrawals, or balances",
  },
  {
    value: "AFFILIATE_LEVEL",
    label: "Affiliate Level",
    icon: Award,
    description: "Questions about level upgrades or requirements",
  },
  {
    value: "LINKS_TRACKING",
    label: "Links & Tracking",
    icon: Link2,
    description: "Issues with tracking links or referrals",
  },
  {
    value: "ACCOUNT_LOGIN",
    label: "Account & Login",
    icon: User,
    description: "Account access or security issues",
  },
  {
    value: "FRAUD_REPORT",
    label: "Fraud Report",
    icon: AlertTriangle,
    description: "Report suspicious activity or fraud",
  },
  {
    value: "OTHER",
    label: "Other",
    icon: HelpCircle,
    description: "General questions or other issues",
  },
];

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
  });

  async function onSubmit(data: TicketFormData) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create ticket");
      }

      const ticket = await response.json();

      toast.success("Ticket created successfully");
      reset();
      setSelectedCategory(null);
      onOpenChange(false);
      router.refresh();
      router.push(`/support/${ticket.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCategorySelect(category: string) {
    setSelectedCategory(category);
    setValue("category", category as TicketFormData["category"]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Describe your issue and our team will get back to you as soon as possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-3">
            <Label>Category</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.value;

                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => handleCategorySelect(category.value)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/50"
                        : "border-border bg-white/5 hover:border-primary/50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 mb-2",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <p className="font-medium text-sm">{category.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {category.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {errors.category && (
              <p className="text-sm text-red-500">Please select a category</p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue"
              {...register("subject")}
              className={errors.subject ? "border-red-500" : ""}
            />
            {errors.subject && (
              <p className="text-sm text-red-500">{errors.subject.message}</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Please provide as much detail as possible..."
              rows={6}
              {...register("message")}
              className={errors.message ? "border-red-500" : ""}
            />
            {errors.message && (
              <p className="text-sm text-red-500">{errors.message.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Include any relevant details like transaction IDs, dates, or screenshots.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
