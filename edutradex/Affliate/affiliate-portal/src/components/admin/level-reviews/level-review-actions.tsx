"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface LevelReviewActionsProps {
  review: {
    id: string;
    status: string;
    currentLevel: string;
    requestedLevel: string;
    partner: {
      name: string;
    };
  };
}

type ActionType = "approve" | "reject" | null;

export function LevelReviewActions({ review }: LevelReviewActionsProps) {
  const router = useRouter();
  const [actionType, setActionType] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const handleAction = async () => {
    if (!actionType) return;

    if (actionType === "reject" && !adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/level-reviews/${review.id}/${actionType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Action failed");
      }

      toast.success(
        actionType === "approve"
          ? `Level upgrade to ${review.requestedLevel} approved`
          : "Level review rejected"
      );

      setActionType(null);
      setAdminNotes("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  if (review.status !== "PENDING") {
    return (
      <span className="text-xs text-muted-foreground">
        {review.status === "APPROVED" ? "Approved" : "Rejected"}
      </span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActionType("approve")}>
            <Check className="h-4 w-4 mr-2 text-green-500" />
            Approve
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActionType("reject")} className="text-red-500">
            <X className="h-4 w-4 mr-2" />
            Reject
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Approve Dialog */}
      <Dialog open={actionType === "approve"} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Level Upgrade</DialogTitle>
            <DialogDescription>
              Approve {review.partner.name}&apos;s upgrade from {review.currentLevel} to {review.requestedLevel}.
              This will immediately update their partner level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approveNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="approveNotes"
                placeholder="Add any notes about this approval"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === "reject"} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Level Upgrade</DialogTitle>
            <DialogDescription>
              Reject {review.partner.name}&apos;s request to upgrade from {review.currentLevel} to {review.requestedLevel}.
              Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectNotes">Rejection Reason *</Label>
              <Textarea
                id="rejectNotes"
                placeholder="Explain why this upgrade request is being rejected"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleAction} disabled={loading || !adminNotes.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
